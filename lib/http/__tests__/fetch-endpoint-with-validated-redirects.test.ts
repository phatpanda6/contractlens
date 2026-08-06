import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchEndpointWithValidatedRedirects,
  EndpointFetchPolicyError,
} from "../fetch-endpoint-with-validated-redirects";

const fetchMock = vi.fn();

describe("fetchEndpointWithValidatedRedirects", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("blocks a redirect to an IPv4 loopback address", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          Location: "https://127.0.0.1/admin",
        },
      }),
    );

    const endpointUrl = "/api/demo/products/redirect";
    const requestUrl = "http://localhost:3000/api/endpoints/example/run";

    const responsePromise = fetchEndpointWithValidatedRedirects(
      endpointUrl,
      requestUrl,
    );

    await expect(responsePromise).rejects.toBeInstanceOf(
      EndpointFetchPolicyError,
    );

    await expect(responsePromise).rejects.toThrow(
      "External endpoint URL must not target an IPv4 loopback address",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("follows a safe redirect and returns the final response", async () => {
    const finalResponse = Response.json({
      id: "p_123",
      title: "Nike Hoodie",
    });

    fetchMock
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: {
            Location: "/api/demo/products/v1",
          },
        }),
      )
      .mockResolvedValueOnce(finalResponse);

    const endpointUrl = "/api/demo/products/redirect";
    const requestUrl = "http://localhost:3000/api/endpoints/example/run";

    const response = await fetchEndpointWithValidatedRedirects(
      endpointUrl,
      requestUrl,
    );

    expect(response).toBe(finalResponse);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("follows multiple safe redirects and returns the final response", async () => {
    const finalResponse = Response.json({
      id: "p_123",
      title: "Nike Hoodie",
    });

    fetchMock
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: {
            Location: "/api/demo/products/redirect-two",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: {
            Location: "/api/demo/products/v1",
          },
        }),
      )
      .mockResolvedValueOnce(finalResponse);

    const endpointUrl = "/api/demo/products/redirect-one";
    const requestUrl = "http://localhost:3000/api/endpoints/example/run";

    const response = await fetchEndpointWithValidatedRedirects(
      endpointUrl,
      requestUrl,
    );

    expect(response).toBe(finalResponse);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("rejects a response that exceeds the redirect limit", async () => {
    const createRedirectResponse = () =>
      new Response(null, {
        status: 302,
        headers: {
          Location: "/api/demo/products/redirect-loop",
        },
      });

    for (let index = 0; index < 6; index += 1) {
      fetchMock.mockResolvedValueOnce(createRedirectResponse());
    }

    fetchMock.mockResolvedValueOnce(
      Response.json({
        id: "p_123",
      }),
    );

    const endpointUrl = "/api/demo/products/redirect-loop";
    const requestUrl = "http://localhost:3000/api/endpoints/example/run";

    const responsePromise = fetchEndpointWithValidatedRedirects(
      endpointUrl,
      requestUrl,
    );

    await expect(responsePromise).rejects.toBeInstanceOf(
      EndpointFetchPolicyError,
    );

    await expect(responsePromise).rejects.toThrow(
      "Endpoint exceeded maximum redirect limit",
    );

    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("returns a 304 response without treating it as a redirect", async () => {
    const notModifiedResponse = new Response(null, {
      status: 304,
    });

    fetchMock.mockResolvedValueOnce(notModifiedResponse);

    const endpointUrl = "/api/demo/products/v1";
    const requestUrl = "http://localhost:3000/api/endpoints/example/run";

    const response = await fetchEndpointWithValidatedRedirects(
      endpointUrl,
      requestUrl,
    );

    expect(response).toBe(notModifiedResponse);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a redirect without a Location header", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
      }),
    );

    const endpointUrl = "/api/demo/products/redirect";
    const requestUrl = "http://localhost:3000/api/endpoints/example/run";

    const responsePromise = fetchEndpointWithValidatedRedirects(
      endpointUrl,
      requestUrl,
    );

    await expect(responsePromise).rejects.toBeInstanceOf(
      EndpointFetchPolicyError,
    );

    await expect(responsePromise).rejects.toThrow(
      "Endpoint redirect is missing a Location header",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("preserves request options across redirect hops", async () => {
    const finalResponse = Response.json({
      id: "p_123",
      title: "Nike Hoodie",
    });

    fetchMock
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: {
            Location: "/api/demo/products/v1",
          },
        }),
      )
      .mockResolvedValueOnce(finalResponse);

    const controller = new AbortController();
    const endpointUrl = "/api/demo/products/redirect";
    const requestUrl = "http://localhost:3000/api/endpoints/example/run";

    const requestInit: RequestInit = {
      method: "GET",
      signal: controller.signal,
    };

    await fetchEndpointWithValidatedRedirects(
      endpointUrl,
      requestUrl,
      requestInit,
    );

    expect(fetchMock).toHaveBeenNthCalledWith(1, expect.any(URL), {
      ...requestInit,
      redirect: "manual",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.any(URL), {
      ...requestInit,
      redirect: "manual",
    });
  });
});
