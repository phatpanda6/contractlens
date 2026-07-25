import { describe, expect, it } from "vitest";
import {
  readResponseBodyWithLimit,
  ResponseBodyTooLargeError,
} from "../read-response-body-with-limit";

describe("readResponseBodyWithLimit", () => {
  it("returns the response body when it is within the byte limit", async () => {
    const body = '{"id":"p_123"}';
    const response = new Response(body);
    const maximumBytes = 100;

    const result = await readResponseBodyWithLimit(response, maximumBytes);

    expect(result).toBe(body);
  });

  it("rejects a response body that exceeds the byte limit", async () => {
    const body = "12345";
    const maximumBytes = 4;
    const response = new Response(body);

    await expect(
      readResponseBodyWithLimit(response, maximumBytes),
    ).rejects.toThrow(ResponseBodyTooLargeError);
  });

  it("returns the response body when it exactly matches the byte limit", async () => {
    const body = "12345";
    const maximumBytes = 5;
    const response = new Response(body);

    const result = await readResponseBodyWithLimit(response, maximumBytes);

    expect(result).toBe(body);
  });

  it("rejects a multibyte response that exceeds the byte limit", async () => {
    const body = "😊";
    const maximumBytes = 3;
    const response = new Response(body);

    await expect(
      readResponseBodyWithLimit(response, maximumBytes),
    ).rejects.toThrow("Response body exceeded maximum size");
  });

  it("rejects a response whose Content-Length exceeds the byte limit", async () => {
    const body = "OK";
    const maximumBytes = 50;
    const contentLength = "100";

    const response = new Response(body, {
      headers: {
        "content-length": contentLength,
      },
    });

    await expect(
      readResponseBodyWithLimit(response, maximumBytes),
    ).rejects.toThrow(ResponseBodyTooLargeError);
  });
});
