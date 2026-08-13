import { prisma } from "@/lib/prisma";
import { validateEndpointUrl } from "@/lib/http/validate-endpoint-url";

type UpdateEndpointBody = {
  name: string;
  url: string;
};

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ endpointId: string }> },
) {
  const { endpointId } = await context.params;

  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "Request body must contain valid JSON" },
        { status: 400 },
      );
    }
    if (
      typeof body !== "object" ||
      body === null ||
      !("name" in body) ||
      typeof body.name !== "string" ||
      !("url" in body) ||
      typeof body.url !== "string"
    ) {
      return Response.json(
        { error: "Name and URL are required" },
        { status: 400 },
      );
    }

    const update: UpdateEndpointBody = {
      name: body.name.trim(),
      url: body.url.trim(),
    };

    if (update.name === "" || update.url === "") {
      return Response.json(
        { error: "Name and URL cannot be empty" },
        { status: 400 },
      );
    }

    try {
      await validateEndpointUrl(update.url, request.url);
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error ? error.message : "Endpoint URL is invalid",
        },
        { status: 400 },
      );
    }

    const existingEndpoint = await prisma.endpoint.findUnique({
      where: {
        id: endpointId,
      },
      select: {
        id: true,
      },
    });

    if (existingEndpoint === null) {
      return Response.json({ error: "Endpoint not found" }, { status: 404 });
    }

    const updatedEndpoint = await prisma.endpoint.update({
      where: {
        id: endpointId,
      },
      data: {
        name: update.name,
        url: update.url,
      },
      select: {
        id: true,
        name: true,
        method: true,
        url: true,
      },
    });

    return Response.json({ endpoint: updatedEndpoint });
  } catch (error) {
    console.error("Failed to update endpoint", error);

    return Response.json(
      { error: "Failed to update endpoint" },
      { status: 500 },
    );
  }
}
