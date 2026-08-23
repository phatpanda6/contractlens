import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoProductV2 } from "@/lib/contractlens/demo-data";
import { POST } from "./route";

const prismaMocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  createTestRun: vi.fn(),
}));

const fetchMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    endpoint: {
      findUnique: prismaMocks.findUnique,
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
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
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
});
