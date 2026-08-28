import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { demoProductV1, demoProductV2 } from "@/lib/contractlens/demo-data";

const prismaMocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  createTestRun: vi.fn(),
  updateEndpoint: vi.fn(),
}));

const fetchMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    endpoint: {
      findUnique: prismaMocks.findUnique,
      update: prismaMocks.updateEndpoint,
    },
    testRun: {
      create: prismaMocks.createTestRun,
    },
  },
}));

describe("POST /api/endpoints/[endpointId]/run", () => {
  beforeEach(() => {
    prismaMocks.findUnique.mockReset();
    prismaMocks.createTestRun.mockReset();
    prismaMocks.updateEndpoint.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("persists FAIL when the latest response contains breaking schema changes", async () => {
    prismaMocks.findUnique.mockResolvedValue({
      id: "endpoint-1",
      method: "GET",
      url: "/api/demo/products/v2",
      baselineSchema: {
        id: "string",
        title: "string",
        price: "number",
        inStock: "boolean",
      },
    });

    vi.spyOn(console, "info").mockImplementation(() => {});

    prismaMocks.createTestRun.mockResolvedValue({
      id: "run-1",
    });

    fetchMock.mockResolvedValue(Response.json(demoProductV2));

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/run",
      { method: "POST" },
    );

    await POST(request, {
      params: Promise.resolve({ endpointId: "endpoint-1" }),
    });

    expect(prismaMocks.createTestRun).toHaveBeenCalledWith({
      data: expect.objectContaining({
        endpointId: "endpoint-1",
        status: "FAIL",
        diff: [
          {
            type: "MISSING_FIELD",
            path: "title",
            severity: "breaking",
          },
          {
            type: "TYPE_CHANGED",
            path: "price",
            severity: "breaking",
            from: "number",
            to: "string",
          },
          {
            type: "NEW_FIELD",
            path: "name",
            severity: "info",
          },
        ],
      }),
    });
  });

  it("logs a structured summary when a breaking run completes", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    prismaMocks.findUnique.mockResolvedValue({
      id: "endpoint-1",
      method: "GET",
      url: "/api/demo/products/v2",
      baselineSchema: {
        id: "string",
        title: "string",
        price: "number",
        inStock: "boolean",
      },
    });

    prismaMocks.createTestRun.mockResolvedValue({
      id: "run-1",
      endpointId: "endpoint-1",
      status: "FAIL",
    });

    fetchMock.mockResolvedValue(Response.json(demoProductV2));

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/run",
      { method: "POST" },
    );

    await POST(request, {
      params: Promise.resolve({ endpointId: "endpoint-1" }),
    });

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "endpoint_run_completed",
        runId: "run-1",
        endpointId: "endpoint-1",
        status: "FAIL",
        durationMs: expect.any(Number),
        diffCount: 3,
      }),
    );
  });

  it("logs a structured summary when a baseline is created", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    prismaMocks.findUnique.mockResolvedValue({
      id: "endpoint-1",
      method: "GET",
      url: "/api/demo/products/v1",
      baselineSchema: null,
    });

    prismaMocks.updateEndpoint.mockResolvedValue({
      id: "endpoint-1",
    });

    prismaMocks.createTestRun.mockResolvedValue({
      id: "run-1",
      endpointId: "endpoint-1",
      status: "BASELINE_CREATED",
    });

    fetchMock.mockResolvedValue(Response.json(demoProductV1));

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/run",
      { method: "POST" },
    );

    await POST(request, {
      params: Promise.resolve({ endpointId: "endpoint-1" }),
    });

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "endpoint_run_completed",
        runId: "run-1",
        endpointId: "endpoint-1",
        status: "BASELINE_CREATED",
        durationMs: expect.any(Number),
        diffCount: 0,
      }),
    );
  });

  it("logs a structured summary when an endpoint returns a non-2xx response", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    prismaMocks.findUnique.mockResolvedValue({
      id: "endpoint-1",
      method: "GET",
      url: "/api/demo/products/v1",
    });

    prismaMocks.createTestRun.mockResolvedValue({
      id: "run-1",
      endpointId: "endpoint-1",
      status: "ERROR",
    });

    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/run",
      { method: "POST" },
    );

    await POST(request, {
      params: Promise.resolve({ endpointId: "endpoint-1" }),
    });

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "endpoint_run_completed",
        runId: "run-1",
        endpointId: "endpoint-1",
        status: "ERROR",
        durationMs: expect.any(Number),
        diffCount: 0,
      }),
    );
  });

  it("logs a structured summary when fetching the endpoint fails", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    prismaMocks.findUnique.mockResolvedValue({
      id: "endpoint-1",
      method: "GET",
      url: "/api/demo/products/v1",
    });

    prismaMocks.createTestRun.mockResolvedValue({
      id: "run-1",
      endpointId: "endpoint-1",
      status: "ERROR",
    });

    fetchMock.mockRejectedValue(new Error("Network unavailable"));

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/run",
      { method: "POST" },
    );

    await POST(request, {
      params: Promise.resolve({ endpointId: "endpoint-1" }),
    });

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "endpoint_run_completed",
        runId: "run-1",
        endpointId: "endpoint-1",
        status: "ERROR",
        durationMs: expect.any(Number),
        diffCount: 0,
      }),
    );
  });

  it("logs a structured summary when the response is not JSON", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    prismaMocks.findUnique.mockResolvedValue({
      id: "endpoint-1",
      method: "GET",
      url: "/api/demo/products/v1",
    });

    prismaMocks.createTestRun.mockResolvedValue({
      id: "run-1",
      endpointId: "endpoint-1",
      status: "ERROR",
    });

    fetchMock.mockResolvedValue(
      new Response("plain text", {
        status: 200,
        headers: {
          "content-type": "text/plain",
        },
      }),
    );

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/run",
      { method: "POST" },
    );

    await POST(request, {
      params: Promise.resolve({ endpointId: "endpoint-1" }),
    });

    expect(prismaMocks.createTestRun).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "ERROR",
        errorMessage: "Expected JSON but received text/plain",
      }),
    });

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "endpoint_run_completed",
        runId: "run-1",
        endpointId: "endpoint-1",
        status: "ERROR",
        durationMs: expect.any(Number),
        diffCount: 0,
      }),
    );
  });

  it("logs a structured summary when the response contains invalid JSON", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    prismaMocks.findUnique.mockResolvedValue({
      id: "endpoint-1",
      method: "GET",
      url: "/api/demo/products/v1",
    });

    prismaMocks.createTestRun.mockResolvedValue({
      id: "run-1",
      endpointId: "endpoint-1",
      status: "ERROR",
    });

    fetchMock.mockResolvedValue(
      new Response("not valid JSON", {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1/run",
      { method: "POST" },
    );

    await POST(request, {
      params: Promise.resolve({ endpointId: "endpoint-1" }),
    });

    expect(prismaMocks.createTestRun).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "ERROR",
        errorMessage: "Endpoint response was not valid JSON",
      }),
    });

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "endpoint_run_completed",
        runId: "run-1",
        endpointId: "endpoint-1",
        status: "ERROR",
        durationMs: expect.any(Number),
        diffCount: 0,
      }),
    );
  });
});
