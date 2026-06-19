import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
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
    return Response.json({ endpoint });
  } catch (error) {
    console.error("Failed to run endpoint check", error);
    return Response.json(
      { error: "Failed to run endpoint check" },
      { status: 500 },
    );
  }
}
