import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        endpoints: {
          select: {
            id: true,
            name: true,
            method: true,
            url: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json({ projects });
  } catch (error) {
    console.error("Failed to fetch projects", error);
    return Response.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}
