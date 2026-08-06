import { validateEndpointUrl } from "./validate-endpoint-url";

const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export class EndpointFetchPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EndpointFetchPolicyError";
  }
}

async function validateUrlForFetch(
  endpointUrl: string,
  requestUrl: string,
): Promise<URL> {
  try {
    return await validateEndpointUrl(endpointUrl, requestUrl);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Endpoint URL validation failed";

    throw new EndpointFetchPolicyError(message);
  }
}

export async function fetchEndpointWithValidatedRedirects(
  endpointUrl: string,
  requestUrl: string,
  requestInit: RequestInit = {},
): Promise<Response> {
  let currentUrl = await validateUrlForFetch(endpointUrl, requestUrl);
  let redirectCount = 0;

  while (true) {
    const response = await fetch(currentUrl, {
      ...requestInit,
      redirect: "manual",
    });

    const isRedirect = REDIRECT_STATUSES.has(response.status);

    if (!isRedirect) {
      return response;
    }

    if (redirectCount >= MAX_REDIRECTS) {
      throw new EndpointFetchPolicyError(
        "Endpoint exceeded maximum redirect limit",
      );
    }

    const location = response.headers.get("location");

    if (location === null) {
      throw new EndpointFetchPolicyError(
        "Endpoint redirect is missing a Location header",
      );
    }

    currentUrl = await validateUrlForFetch(location, currentUrl.href);

    redirectCount += 1;
  }
}
