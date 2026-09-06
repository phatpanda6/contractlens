import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { demoProductV2 } from "@/lib/contractlens/demo-data";

const prismaMocks = vi.hoisted(() => ({
  findTestRun: vi.fn(),
  updateEndpoint: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    testRun: {
      findFirst: prismaMocks.findTestRun,
    },
    endpoint: {
      update: prismaMocks.updateEndpoint,
    },
  },
}));

describe("POST /api/endpoints/[endpointId]/baseline", () => {
  beforeEach(() => {
    prismaMocks.findTestRun.mockReset();
    prismaMocks.updateEndpoint.mockReset();
  });

  it("replaces the endpoint baseline with a selected completed test run", async () => {
    const detectedSchema = {
      id: "string",
      name: "string",
      price: "string",
      inStock: "boolean",
    };

    prismaMocks.findTestRun.mockResolvedValue({
      id: "run-2",
      endpointId: "endpoint-1",
      status: "FAIL",
      responseBody: demoProductV2,
      detectedSchema,
    });

    prismaMocks.updateEndpoint.mockResolvedValue({
      id: "endpoint-1",
      baselineExample: demoProductV2,
      baselineSchema: detectedSchema,
    });

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/baseline",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testRunId: "run-2",
        }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
      }),
    });

    const responseBody = await response.json();

    expect(prismaMocks.findTestRun).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "run-2",
          endpointId: "endpoint-1",
        },
      }),
    );

    expect(prismaMocks.updateEndpoint).toHaveBeenCalledWith({
      where: {
        id: "endpoint-1",
      },
      data: {
        baselineExample: demoProductV2,
        baselineSchema: detectedSchema,
      },
      select: {
        id: true,
        baselineExample: true,
        baselineSchema: true,
      },
    });

    expect(response.status).toBe(200);
    expect(responseBody).toEqual({
      endpoint: {
        id: "endpoint-1",
        baselineExample: demoProductV2,
        baselineSchema: detectedSchema,
      },
    });
  });

  it("returns 400 when the request is not valid JSON", async () => {
    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/baseline",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{testRunId:",
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
      }),
    });

    expect(response.status).toBe(400);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      error: "Request body must be valid JSON",
    });

    expect(prismaMocks.findTestRun).not.toHaveBeenCalled();
    expect(prismaMocks.updateEndpoint).not.toHaveBeenCalled();
  });

  it("returns 400 when a testRunId is blank", async () => {
    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/baseline",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ testRunId: "   " }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
      }),
    });

    expect(response.status).toBe(400);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      error: "testRunId must be a non-empty string",
    });

    expect(prismaMocks.findTestRun).not.toHaveBeenCalled();
    expect(prismaMocks.updateEndpoint).not.toHaveBeenCalled();
  });

  it("returns 404 when the selected test run does not exist", async () => {
    prismaMocks.findTestRun.mockResolvedValue(null);

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/baseline",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ testRunId: "missing-run" }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
      }),
    });

    const responseBody = await response.json();

    expect(prismaMocks.findTestRun).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "missing-run",
          endpointId: "endpoint-1",
        },
      }),
    );

    expect(response.status).toBe(404);

    expect(responseBody).toEqual({
      error: "Test run not found",
    });

    expect(prismaMocks.updateEndpoint).not.toHaveBeenCalled();
  });

  it("returns 409 when the selected test run cannot become a baseline", async () => {
    prismaMocks.findTestRun.mockResolvedValue({
      status: "ERROR",
      responseBody: null,
      detectedSchema: null,
    });

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/baseline",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ testRunId: "run-error" }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
      }),
    });

    const responseBody = await response.json();

    expect(response.status).toBe(409);

    expect(responseBody).toEqual({
      error: "This test run cannot be accepted as the new baseline",
    });

    expect(prismaMocks.updateEndpoint).not.toHaveBeenCalled();
  });

  it("returns 500 when updating the baseline unexpectedly fails", async () => {
    const detectedSchema = {
      id: "string",
      name: "string",
      price: "string",
      inStock: "boolean",
    };

    prismaMocks.findTestRun.mockResolvedValue({
      id: "run-2",
      endpointId: "endpoint-1",
      status: "FAIL",
      responseBody: demoProductV2,
      detectedSchema,
    });

    prismaMocks.updateEndpoint.mockRejectedValue(
      new Error("Database unavailable"),
    );

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/baseline",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ testRunId: "run-2" }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
      }),
    });

    const responseBody = await response.json();

    expect(response.status).toBe(500);

    expect(responseBody).toEqual({
      error: "Failed to update baseline",
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to update baseline",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
