import { prisma } from "@/lib/prisma";
import { inferSchema } from "@/lib/contractlens";

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

      return Response.json({
        endpoint: updatedEndpoint,
        responseBody,
        detectedSchema,
      });
    }

    return Response.json({ endpoint, responseBody, detectedSchema });
  } catch (error) {
    console.error("Failed to run endpoint check", error);
    return Response.json(
      { error: "Failed to run endpoint check" },
      { status: 500 },
    );
  }
}
