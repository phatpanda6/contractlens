import { isIP } from "node:net";

export async function validateEndpointUrl(
  endpointUrl: string,
  requestUrl: string,
): Promise<URL> {
  const resolvedUrl = new URL(endpointUrl, requestUrl);
  const hostname = resolvedUrl.hostname;

  const isRelativeUrl = endpointUrl.startsWith("/");
  const isDemoRoute = resolvedUrl.pathname.startsWith("/api/demo/");

  if (isRelativeUrl && !isDemoRoute) {
    throw new Error("Relative endpoint URL is not allowed");
  }

  const isExternalUrl = !isRelativeUrl;
  const usesHttps = resolvedUrl.protocol === "https:";

  if (isExternalUrl && !usesHttps) {
    throw new Error("External endpoint URL must use HTTPS");
  }

  const hasCredentials =
    resolvedUrl.username !== "" || resolvedUrl.password !== "";

  if (isExternalUrl && hasCredentials) {
    throw new Error("External endpoint URL must not include credentials");
  }

  const normalisedHostname =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;

  const targetsLocalhost = normalisedHostname === "localhost";

  if (isExternalUrl && targetsLocalhost) {
    throw new Error("External endpoint URL must not target localhost");
  }

  const isIpv4Address = isIP(normalisedHostname) === 4;

  const targetsIpv4Loopback =
    isIpv4Address && normalisedHostname.startsWith("127.");

  if (isExternalUrl && targetsIpv4Loopback) {
    throw new Error(
      "External endpoint URL must not target an IPv4 loopback address",
    );
  }

  const isIpv6Address = isIP(normalisedHostname) === 6;

  const targetsIpv6Loopback = isIpv6Address && normalisedHostname === "::1";

  if (isExternalUrl && targetsIpv6Loopback) {
    throw new Error(
      "External endpoint URL must not target an IPv6 loopback address",
    );
  }

  const targetsIpv6Unspecified = isIpv6Address && normalisedHostname === "::";

  if (isExternalUrl && targetsIpv6Unspecified) {
    throw new Error(
      "External endpoint URL must not target the IPv6 unspecified address",
    );
  }

  const targetsIpv4MappedIpv6 =
    isIpv6Address && normalisedHostname.startsWith("::ffff:");

  if (isExternalUrl && targetsIpv4MappedIpv6) {
    throw new Error(
      "External endpoint URL must not use an IPv4-mapped IPv6 address",
    );
  }

  const [firstIpv6Segment = ""] = isIpv6Address
    ? normalisedHostname.split(":")
    : [];

  const firstIpv6SegmentValue = Number.parseInt(firstIpv6Segment, 16);

  const targetsIpv6LinkLocal =
    isIpv6Address &&
    firstIpv6SegmentValue >= 0xfe80 &&
    firstIpv6SegmentValue <= 0xfebf;

  if (isExternalUrl && targetsIpv6LinkLocal) {
    throw new Error(
      "External endpoint URL must not target an IPv6 link-local address",
    );
  }

  const targetsIpv6UniqueLocal =
    isIpv6Address &&
    firstIpv6SegmentValue >= 0xfc00 &&
    firstIpv6SegmentValue <= 0xfdff;

  if (isExternalUrl && targetsIpv6UniqueLocal) {
    throw new Error(
      "External endpoint URL must not target an IPv6 unique-local address",
    );
  }

  const targetsIpv6Multicast =
    isIpv6Address &&
    firstIpv6SegmentValue >= 0xff00 &&
    firstIpv6SegmentValue <= 0xffff;

  if (isExternalUrl && targetsIpv6Multicast) {
    throw new Error(
      "External endpoint URL must not target an IPv6 multicast address",
    );
  }

  const [firstOctet = -1, secondOctet = -1] = isIpv4Address
    ? normalisedHostname.split(".").map(Number)
    : [];

  const targetsIpv4ThisNetwork = isIpv4Address && firstOctet === 0;

  if (isExternalUrl && targetsIpv4ThisNetwork) {
    throw new Error(
      "External endpoint URL must not target the IPv4 0.0.0.0/8 range",
    );
  }

  const isPrivateTenRange = isIpv4Address && firstOctet === 10;

  const isPrivateOneSeventyTwoRange =
    isIpv4Address &&
    firstOctet === 172 &&
    secondOctet >= 16 &&
    secondOctet <= 31;

  const isPrivateOneNinetyTwoRange =
    isIpv4Address && firstOctet === 192 && secondOctet === 168;

  const targetsPrivateIpv4 =
    isPrivateTenRange ||
    isPrivateOneSeventyTwoRange ||
    isPrivateOneNinetyTwoRange;

  if (isExternalUrl && targetsPrivateIpv4) {
    throw new Error(
      "External endpoint URL must not target a private IPv4 address",
    );
  }

  const targetsIpv4SharedAddress =
    isIpv4Address &&
    firstOctet === 100 &&
    secondOctet >= 64 &&
    secondOctet <= 127;

  if (isExternalUrl && targetsIpv4SharedAddress) {
    throw new Error(
      "External endpoint URL must not target an IPv4 shared address",
    );
  }

  const targetsIpv4Benchmarking =
    isIpv4Address &&
    firstOctet === 198 &&
    secondOctet >= 18 &&
    secondOctet <= 19;

  if (isExternalUrl && targetsIpv4Benchmarking) {
    throw new Error(
      "External endpoint URL must not target an IPv4 benchmarking address",
    );
  }

  const targetsIpv4LinkLocal =
    isIpv4Address && firstOctet === 169 && secondOctet === 254;

  if (isExternalUrl && targetsIpv4LinkLocal) {
    throw new Error(
      "External endpoint URL must not target an IPv4 link-local address",
    );
  }

  const targetsIpv4Multicast =
    isIpv4Address && firstOctet >= 224 && firstOctet <= 239;

  if (isExternalUrl && targetsIpv4Multicast) {
    throw new Error(
      "External endpoint URL must not target an IPv4 multicast address",
    );
  }

  const targetsReservedIpv4 = isIpv4Address && firstOctet >= 240;

  if (isExternalUrl && targetsReservedIpv4) {
    throw new Error(
      "External endpoint URL must not target a reserved IPv4 address",
    );
  }

  return resolvedUrl;
}
