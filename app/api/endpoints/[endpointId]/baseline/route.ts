import { prisma } from "@/lib/prisma";

export async function POST(
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
        { error: "Request body must be valid JSON" },
        { status: 400 },
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("testRunId" in body) ||
      typeof body.testRunId !== "string" ||
      body.testRunId.trim() === ""
    ) {
      return Response.json(
        { error: "testRunId must be a non-empty string" },
        { status: 400 },
      );
    }

    const testRunId = body.testRunId.trim();

    const selectedRun = await prisma.testRun.findFirst({
      where: {
        id: testRunId,
        endpointId,
      },
      select: {
        responseBody: true,
        detectedSchema: true,
        status: true,
      },
    });

    if (selectedRun === null) {
      return Response.json(
        { error: "Test run not found" },
        { status: 404 },
      );
    }

    if (
      (selectedRun.status !== "PASS" && selectedRun.status !== "FAIL") ||
      selectedRun.detectedSchema === null ||
      selectedRun.responseBody === null
    ) {
      return Response.json(
        { error: "This test run cannot be accepted as the new baseline" },
        { status: 409 },
      );
    }

    const updatedBaselineEndpoint = await prisma.endpoint.update({
      where: {
        id: endpointId,
      },
      data: {
        baselineExample: selectedRun.responseBody,
        baselineSchema: selectedRun.detectedSchema,
      },
      select: {
        id: true,
        baselineExample: true,
        baselineSchema: true,
      },
    });

    return Response.json({
      endpoint: updatedBaselineEndpoint,
    });
  } catch (error) {
    console.error("Failed to update baseline", error);
    return Response.json(
      { error: "Failed to update baseline" },
      { status: 500 },
    );
  }
}
