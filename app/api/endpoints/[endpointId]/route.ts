import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ endpointId: string }> },
) {
  const { endpointId } = await context.params;
  try {
    const endpoint = await prisma.endpoint.findUnique({
      where: {
        id: endpointId,
      },
      select: {
        id: true,
        name: true,
        method: true,
        url: true,
        baselineSchema: true,
        baselineExample: true,
        createdAt: true,
        testRuns: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            errorMessage: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
    });

    if (!endpoint) {
      return Response.json({ error: "Endpoint not found" }, { status: 404 });
    }

    return Response.json({ endpoint });
  } catch (error) {
    console.error("Failed to fetch endpoint", error);
    return Response.json(
      { error: "Failed to fetch endpoint" },
      { status: 500 },
    );
  }
}
