import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";

const prismaMocks = vi.hoisted(() => ({
  findTestRun: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    testRun: {
      findFirst: prismaMocks.findTestRun,
      update: prismaMocks.update,
    },
  },
}));

const explanationMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/ai/explain-diffs", () => ({
  explainDiffs: explanationMock,
}));

describe("POST /api/endpoints/[endpointId]/run/[runId]/explain", () => {
  beforeEach(() => {
    prismaMocks.findTestRun.mockReset();
    prismaMocks.update.mockReset();
    explanationMock.mockReset();
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("explains a saved FAIL run without rewriting its status or diffs", async () => {
    // Arrange: database lookup returns a FAIL run with one TYPE_CHANGED diff.
    const diffs = [
      {
        type: "TYPE_CHANGED",
        path: "price",
        from: "number",
        to: "string",
        severity: "breaking",
      },
    ];

    prismaMocks.findTestRun.mockResolvedValue({
      id: "run-1",
      endpointId: "endpoint-1",
      status: "FAIL",
      diff: diffs,
    });
    // Arrange: explanation function returns a predictable explanation.

    const explanation =
      "Changing price from number to string may affect calculations";

    explanationMock.mockResolvedValue(explanation);

    prismaMocks.update.mockResolvedValue({ aiExplanation: explanation });

    // Act: call POST with the endpointId and runId.
    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/run/run-1/explain",
      { method: "POST" },
    );

    const response = await POST(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
        runId: "run-1",
      }),
    });

    expect(prismaMocks.findTestRun).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "run-1",
          endpointId: "endpoint-1",
        },
      }),
    );

    // Assert: the explanation function received the stored diffs.
    expect(explanationMock).toHaveBeenCalledWith(diffs);

    // Assert: the database update writes only aiExplanation.
    expect(prismaMocks.update).toHaveBeenCalledTimes(1);

    expect(prismaMocks.update.mock.calls[0][0].data).toEqual({
      aiExplanation: explanation,
    });

    // Assert: the response contains the saved explanation.
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ aiExplanation: explanation });
  });

  it("rejects a PASS run without requesting an explanation", async () => {
    prismaMocks.findTestRun.mockResolvedValue({
      id: "run-2",
      endpointId: "endpoint-1",
      status: "PASS",
      diff: [],
    });

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/run/run-2/explain",
      { method: "POST" },
    );

    const response = await POST(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
        runId: "run-2",
      }),
    });

    expect(response.status).toBe(409);
    expect(explanationMock).not.toHaveBeenCalled();
    expect(prismaMocks.update).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing run without requesting an explanation", async () => {
    prismaMocks.findTestRun.mockResolvedValue(null);

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/run/missing-run/explain",
      { method: "POST" },
    );

    const response = await POST(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
        runId: "missing-run",
      }),
    });

    expect(response.status).toBe(404);
    expect(explanationMock).not.toHaveBeenCalled();
    expect(prismaMocks.update).not.toHaveBeenCalled();
  });

  it("disables explanations in hosted demo mode", async () => {
    vi.stubEnv("HOSTED_DEMO_MODE", "true");

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/run/run-1/explain",
      { method: "POST" },
    );

    const response = await POST(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
        runId: "run-1",
      }),
    });

    expect(response.status).toBe(404);
    expect(prismaMocks.findTestRun).not.toHaveBeenCalled();
    expect(explanationMock).not.toHaveBeenCalled();
    expect(prismaMocks.update).not.toHaveBeenCalled();
  });

  it("disables explanations in production even when hosted demo mode is off", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("HOSTED_DEMO_MODE", "false");

    prismaMocks.findTestRun.mockResolvedValue(null);

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/run/run-1/explain",
      { method: "POST" },
    );

    const response = await POST(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
        runId: "run-1",
      }),
    });

    expect(response.status).toBe(404);
    expect(prismaMocks.findTestRun).not.toHaveBeenCalled();
    expect(explanationMock).not.toHaveBeenCalled();
    expect(prismaMocks.update).not.toHaveBeenCalled();
  });

  it("preserves a saved FAIL run when explanation generation fails", async () => {
    const diffs = [
      {
        type: "TYPE_CHANGED",
        path: "price",
        from: "number",
        to: "string",
        severity: "breaking",
      },
    ];

    prismaMocks.findTestRun.mockResolvedValue({
      id: "run-1",
      endpointId: "endpoint-1",
      status: "FAIL",
      diff: diffs,
    });

    explanationMock.mockRejectedValue(new Error("Provider unavailable"));

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/run/run-1/explain",
      { method: "POST" },
    );

    const response = await POST(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
        runId: "run-1",
      }),
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Explanation failed. Please try again",
    });
    expect(prismaMocks.update).not.toHaveBeenCalled();
    expect(explanationMock).toHaveBeenCalledWith(diffs);
  });

  it("does not save a blank explanation for a FAIL run", async () => {
    const diffs = [
      {
        type: "TYPE_CHANGED",
        path: "price",
        from: "number",
        to: "string",
        severity: "breaking",
      },
    ];

    prismaMocks.findTestRun.mockResolvedValue({
      id: "run-1",
      endpointId: "endpoint-1",
      status: "FAIL",
      diff: diffs,
    });

    explanationMock.mockResolvedValue("   ");

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/run/run-1/explain",
      { method: "POST" },
    );

    const response = await POST(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
        runId: "run-1",
      }),
    });

    expect(response.status).toBe(502);
    expect(prismaMocks.update).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      error: "Explanation failed. Please try again",
    });
  });
});
