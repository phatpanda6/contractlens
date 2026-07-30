import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateEndpointUrl } from "../validate-endpoint-url";

const { lookupMock } = vi.hoisted(() => ({
  lookupMock: vi.fn(),
}));

vi.mock("node:dns/promises", () => ({
  lookup: lookupMock,
}));

describe("validateEndpointUrl", () => {
  beforeEach(() => {
    lookupMock.mockReset();
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  });

  it("allows a relative ContractLens demo route", async () => {
    const endpointUrl = "/api/demo/products/v1";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    const result = await validateEndpointUrl(endpointUrl, requestUrl);

    expect(result.href).toBe("http://localhost:3000/api/demo/products/v1");
  });

  it("rejects a relative route outside the ContractLens demo routes", async () => {
    const endpointUrl = "/api/projects";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("allows an absolute HTTPS endpoint", async () => {
    const endpointUrl = "https://api.example.com/products";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    const result = await validateEndpointUrl(endpointUrl, requestUrl);

    expect(result.href).toBe(endpointUrl);
  });

  it("rejects an absolute HTTP endpoint", async () => {
    const endpointUrl = "http://api.example.com/products";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects an absolute HTTPS endpoint with embedded credentials", async () => {
    const endpointUrl = "https://alan:secret@api.example.com/products";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects an absolute HTTPS endpoint targeting localhost", async () => {
    const endpointUrl = "https://localhost:4443/admin";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects an absolute HTTPS endpoint targeting an IPv4 loopback address", async () => {
    const endpointUrl = "https://127.0.0.1:4443/admin";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects another address in the IPv4 loopback range", async () => {
    const endpointUrl = "https://127.20.30.40:4443/admin";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects an absolute HTTPS endpoint targeting an IPv6 loopback address", async () => {
    const endpointUrl = "https://[::1]:4443/admin";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects an absolute HTTPS endpoint in the private 10.0.0.0/8 range", async () => {
    const endpointUrl = "https://10.20.30.40:4443/admin";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects an absolute HTTPS endpoint in the private 172.16.0.0/12 range", async () => {
    const endpointUrl = "https://172.20.30.40:4443/admin";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects an absolute HTTPS endpoint in the private 192.168.0.0/16 range", async () => {
    const endpointUrl = "https://192.168.1.20:4443/admin";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("allows an IPv4 address immediately below the private 172 range", async () => {
    const endpointUrl = "https://172.15.255.255:4443/products";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    const result = await validateEndpointUrl(endpointUrl, requestUrl);

    expect(result.href).toBe(endpointUrl);
  });

  it("allows an IPv4 address immediately above the private 172 range", async () => {
    const endpointUrl = "https://172.32.0.1:4443/products";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    const result = await validateEndpointUrl(endpointUrl, requestUrl);

    expect(result.href).toBe(endpointUrl);
  });

  it("rejects the beginning of the private 172 range", async () => {
    const endpointUrl = "https://172.16.0.1:4443/admin";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects the end of the private 172 range", async () => {
    const endpointUrl = "https://172.31.255.255:4443/admin";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects an absolute HTTPS endpoint targeting an IPv4 link-local address", async () => {
    const endpointUrl = "https://169.254.169.254/latest/meta-data";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects an absolute HTTPS endpoint targeting the IPv4 unspecified address", async () => {
    const endpointUrl = "https://0.0.0.0:4443/admin";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects an absolute HTTPS endpoint targeting an IPv6 link-local address", async () => {
    const endpointUrl = "https://[fe80::1]:4443/admin";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects an absolute HTTPS endpoint targeting an IPv6 unique-local address", async () => {
    const endpointUrl = "https://[fd12:3456:789a::1]:4443/admin";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects an absolute HTTPS endpoint targeting the IPv6 unspecified address", async () => {
    const endpointUrl = "https://[::]:4443/admin";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects an absolute HTTPS endpoint targeting an IPv4 multicast address", async () => {
    const endpointUrl = "https://224.0.0.1:4443/admin";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects an absolute HTTPS endpoint targeting an IPv6 multicast address", async () => {
    const endpointUrl = "https://[ff02::1]:4443/admin";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects an absolute HTTPS endpoint targeting an IPv4 shared address", async () => {
    const endpointUrl = "https://100.64.0.1:4443/admin";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects an absolute HTTPS endpoint targeting a reserved IPv4 address", async () => {
    const endpointUrl = "https://240.0.0.1:4443/admin";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects an IPv4 loopback address represented as IPv6", async () => {
    const endpointUrl = "https://[::ffff:127.0.0.1]:4443/admin";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects an absolute HTTPS endpoint targeting an IPv4 benchmarking address", async () => {
    const endpointUrl = "https://198.18.0.1:4443/admin";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects a hostname that resolves to a private IPv4 address", async () => {
    const endpointUrl = "https://internal.example.com/products";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    lookupMock.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);

    await expect(
      validateEndpointUrl(endpointUrl, requestUrl),
    ).rejects.toThrow();
  });

  it("rejects a hostname when any resolved address is private", async () => {
    const endpointUrl = "https://mixed.example.com/products";
    const requestUrl = "http://localhost:3000/api/endpoints/endpoint-1/run";

    lookupMock.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.5", family: 4 },
    ]);

    await expect(validateEndpointUrl(endpointUrl, requestUrl)).rejects.toThrow(
      "External endpoint URL must not target a private IPv4 address",
    );
  });
});
