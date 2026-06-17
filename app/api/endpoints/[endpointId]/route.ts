import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ endpointId: string }> },
) {
  const params = await context.params;
  const endpointId = params.endpointId;
  try {
    const endpoint = await prisma.endpoint.findUnique({
      where: {
        id: endpointId,
      },
    });
    return Response.json({ endpoint });
  } catch (error) {
    console.error("Failed to fetch endpoint", error);
    return Response.json(
      { error: "Failed to fetch endpoint" },
      { status: 500 },
    );
  }
}
 