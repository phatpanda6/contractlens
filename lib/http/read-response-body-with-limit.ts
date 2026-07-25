export class ResponseBodyTooLargeError extends Error {
  constructor() {
    super("Response body exceeded maximum size");
    this.name = "ResponseBodyTooLargeError";
  }
}

export async function readResponseBodyWithLimit(
  response: Response,
  maximumBytes: number,
): Promise<string> {
  const contentLengthHeader = response.headers.get("content-length");

  if (contentLengthHeader !== null) {
    const contentLength = Number(contentLengthHeader);

    if (Number.isSafeInteger(contentLength) && contentLength > maximumBytes) {
      throw new ResponseBodyTooLargeError();
    }
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let totalBytes = 0;
  let bodyText = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maximumBytes) {
      await reader.cancel();
      throw new ResponseBodyTooLargeError();
    }

    bodyText += decoder.decode(value, { stream: true });
  }

  bodyText += decoder.decode();

  return bodyText;
}
