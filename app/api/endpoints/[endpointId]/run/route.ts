import { prisma } from "@/lib/prisma";
import {
  inferSchema,
  compareSchemas,
  type JsonSchemaShape,
} from "@/lib/contractlens";

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

    const targetUrl = new URL(endpoint.url, request.url);
    const response = await fetch(targetUrl, {
      method: endpoint.method,
    });

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

    const responseBody = await response.json();

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
