import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "./route";

const prismaMocks = vi.hoisted(() => ({
  findEndpoint: vi.fn(),
  updateEndpoint: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    endpoint: {
      findUnique: prismaMocks.findEndpoint,
      update: prismaMocks.updateEndpoint,
    },
  },
}));

describe("PATCH /api/endpoints/[endpointId]", () => {
  beforeEach(() => {
    prismaMocks.findEndpoint.mockReset();
    prismaMocks.updateEndpoint.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 400 for malformed JSON without accessing the database", async () => {
    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: '{"name":',
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
      }),
    });

    expect(response.status).toBe(400);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      error: "Request body must contain valid JSON",
    });

    expect(prismaMocks.findEndpoint).not.toHaveBeenCalled();
    expect(prismaMocks.updateEndpoint).not.toHaveBeenCalled();
  });

  it("returns 400 for a whitespace-only name without accessing the database", async () => {
    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "   ",
          url: "/api/demo/products/v1",
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
      }),
    });

    expect(response.status).toBe(400);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      error: "Name and URL cannot be empty",
    });

    expect(prismaMocks.findEndpoint).not.toHaveBeenCalled();
    expect(prismaMocks.updateEndpoint).not.toHaveBeenCalled();
  });

  it("returns 400 for a whitespace-only URL without accessing the database", async () => {
    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Demo Products API",
          url: "   ",
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
      }),
    });

    expect(response.status).toBe(400);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      error: "Name and URL cannot be empty",
    });

    expect(prismaMocks.findEndpoint).not.toHaveBeenCalled();
    expect(prismaMocks.updateEndpoint).not.toHaveBeenCalled();
  });

  it("returns 400 when the URL is missing without accessing the database", async () => {
    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Demo Products API",
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
      }),
    });

    expect(response.status).toBe(400);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      error: "Name and URL are required",
    });

    expect(prismaMocks.findEndpoint).not.toHaveBeenCalled();
    expect(prismaMocks.updateEndpoint).not.toHaveBeenCalled();
  });

  it("returns 400 when the name is not a string without accessing the database", async () => {
    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: 123,
          url: "/api/demo/products/v1",
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
      }),
    });

    expect(response.status).toBe(400);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      error: "Name and URL are required",
    });

    expect(prismaMocks.findEndpoint).not.toHaveBeenCalled();
    expect(prismaMocks.updateEndpoint).not.toHaveBeenCalled();
  });

  it("returns 400 for an external HTTP URL without accessing the database", async () => {
    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Demo Products API",
          url: "http://example.com/products",
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
      }),
    });

    expect(response.status).toBe(400);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      error: "External endpoint URL must use HTTPS",
    });

    expect(prismaMocks.findEndpoint).not.toHaveBeenCalled();
    expect(prismaMocks.updateEndpoint).not.toHaveBeenCalled();
  });

  it("returns 400 for an external HTTPS URL in hosted mode without accessing the database", async () => {
    vi.stubEnv("HOSTED_DEMO_MODE", "true");
    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Demo Products API",
          url: "https://api.example.com/products",
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ endpointId: "endpoint-1" }),
    });

    expect(response.status).toBe(400);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      error: "Hosted demo only allows approved ContractLens demo endpoints",
    });

    expect(prismaMocks.findEndpoint).not.toHaveBeenCalled();
    expect(prismaMocks.updateEndpoint).not.toHaveBeenCalled();
  });

  it("returns 404 when the endpoint does not exist without updating the database", async () => {
    prismaMocks.findEndpoint.mockResolvedValue(null);

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Demo Products API",
          url: "/api/demo/products/v1",
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
      }),
    });

    expect(response.status).toBe(404);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      error: "Endpoint not found",
    });

    expect(prismaMocks.findEndpoint).toHaveBeenCalled();
    expect(prismaMocks.updateEndpoint).not.toHaveBeenCalled();
  });

  it("trims and persists a valid endpoint update", async () => {
    prismaMocks.findEndpoint.mockResolvedValue({ id: "endpoint-1" });
    prismaMocks.updateEndpoint.mockResolvedValue({
      id: "endpoint-1",
      name: "Demo Products API",
      method: "GET",
      url: "/api/demo/products/v2",
    });

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: " Demo Products API ",
          url: " /api/demo/products/v2 ",
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
      }),
    });

    expect(response.status).toBe(200);

    expect(prismaMocks.updateEndpoint).toHaveBeenCalledWith({
      where: {
        id: "endpoint-1",
      },
      data: {
        name: "Demo Products API",
        url: "/api/demo/products/v2",
      },
      select: {
        id: true,
        name: true,
        method: true,
        url: true,
      },
    });

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      endpoint: {
        id: "endpoint-1",
        name: "Demo Products API",
        method: "GET",
        url: "/api/demo/products/v2",
      },
    });
  });

  it("returns 500 when the database update fails", async () => {
    prismaMocks.findEndpoint.mockResolvedValue({
      id: "endpoint-1",
    });

    prismaMocks.updateEndpoint.mockRejectedValue(
      new Error("Database unavailable"),
    );

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const request = new Request(
      "http://localhost:3000/api/endpoints/endpoint-1",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Demo Products API",
          url: "/api/demo/products/v2",
        }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({
        endpointId: "endpoint-1",
      }),
    });

    const responseBody = await response.json();

    expect(response.status).toBe(500);

    expect(responseBody).toEqual({
      error: "Failed to update endpoint",
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to update endpoint",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
