import { prisma } from "@/lib/prisma";
import {
  inferSchema,
  compareSchemas,
  type JsonSchemaShape,
} from "@/lib/contractlens";
import {
  readResponseBodyWithLimit,
  ResponseBodyTooLargeError,
} from "@/lib/http/read-response-body-with-limit";
import {
  EndpointFetchPolicyError,
  fetchEndpointWithValidatedRedirects,
} from "@/lib/http/fetch-endpoint-with-validated-redirects";

const MAX_RESPONSE_BYTES = 1_048_576;

export async function POST(
  request: Request,
  context: { params: Promise<{ endpointId: string }> },
) {
  const { endpointId } = await context.params;
  try {
    const endpoint = await prisma.endpoint.findUnique({
      where: {
        id: endpointId,
      },
    });

    if (!endpoint) {
      return Response.json({ error: "Endpoint not found" }, { status: 404 });
    }

    let response: Response;

    try {
      response = await fetchEndpointWithValidatedRedirects(
        endpoint.url,
        request.url,
        {
          method: endpoint.method,
          signal: AbortSignal.timeout(5_000),
        },
      );
    } catch (error) {
      let errorMessage: string;

      if (error instanceof EndpointFetchPolicyError) {
        errorMessage = error.message;
      } else if (
        error instanceof DOMException &&
        error.name === "TimeoutError"
      ) {
        errorMessage = "Endpoint request timed out";
      } else {
        errorMessage = "Endpoint request failed";
      }

      const testRun = await prisma.testRun.create({
        data: {
          endpointId: endpoint.id,
          status: "ERROR",
          errorMessage,
        },
      });

      return Response.json({ endpoint, testRun });
    }

    if (!response.ok) {
      const testRun = await prisma.testRun.create({
        data: {
          endpointId: endpoint.id,
          status: "ERROR",
          errorMessage: `Endpoint returned HTTP ${response.status}`,
        },
      });

      return Response.json({ endpoint, testRun });
    }

    const contentType = response.headers.get("content-type");
    const mediaType = contentType?.split(";")[0].trim().toLowerCase();
    const isStandardJson = mediaType === "application/json";
    const isSpecializedJson = mediaType?.endsWith("+json") === true;
    const isJsonContentType = isStandardJson || isSpecializedJson;

    if (!isJsonContentType) {
      const testRun = await prisma.testRun.create({
        data: {
          endpointId: endpoint.id,
          status: "ERROR",
          errorMessage: `Expected JSON but received ${contentType ?? "no Content-Type header"}`,
        },
      });

      return Response.json({ endpoint, testRun });
    }

    let responseBody;

    try {
      const responseText = await readResponseBodyWithLimit(
        response,
        MAX_RESPONSE_BYTES,
      );

      responseBody = JSON.parse(responseText);
    } catch (error) {
      let errorMessage: string;

      if (error instanceof ResponseBodyTooLargeError) {
        errorMessage = "Endpoint response was too large";
      } else if (error instanceof SyntaxError) {
        errorMessage = "Endpoint response was not valid JSON";
      } else {
        errorMessage = "Endpoint response could not be read";
      }

      const testRun = await prisma.testRun.create({
        data: {
          endpointId: endpoint.id,
          status: "ERROR",
          errorMessage,
        },
      });

      return Response.json({ endpoint, testRun });
    }

    const detectedSchema = inferSchema(responseBody);

    if (endpoint.baselineSchema === null) {
      const updatedEndpoint = await prisma.endpoint.update({
        where: {
          id: endpoint.id,
        },
        data: {
          baselineExample: responseBody,
          baselineSchema: detectedSchema,
        },
      });

      const testRun = await prisma.testRun.create({
        data: {
          endpointId: endpoint.id,
          status: "BASELINE_CREATED",
          responseBody,
          detectedSchema,
          diff: [],
        },
      });

      return Response.json({
        endpoint: updatedEndpoint,
        testRun,
      });
    }

    const baselineSchema = endpoint.baselineSchema as JsonSchemaShape;
    const diffs = compareSchemas(baselineSchema, detectedSchema);

    const hasBreakingChanges = diffs.some(
      (diff) => diff.severity === "breaking",
    );

    const status = hasBreakingChanges ? "FAIL" : "PASS";

    const testRun = await prisma.testRun.create({
      data: {
        endpointId: endpoint.id,
        status,
        responseBody,
        detectedSchema,
        diff: diffs,
      },
    });

    return Response.json({ endpoint, testRun });
  } catch (error) {
    console.error("Failed to run endpoint check", error);
    return Response.json(
      { error: "Failed to run endpoint check" },
      { status: 500 },
    );
  }
}
