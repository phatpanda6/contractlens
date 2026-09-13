import type { DashboardProject } from "./dashboard";
import type { EndpointAction } from "./endpoint-actions";

type Endpoint = DashboardProject["endpoints"][number];
type Run = Endpoint["testRuns"][number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRun(value: unknown): Run {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.createdAt !== "string" ||
    (value.targetUrl !== null && typeof value.targetUrl !== "string") ||
    !["BASELINE_CREATED", "PASS", "FAIL", "ERROR"].includes(
      String(value.status),
    )
  ) {
    throw new Error("Invalid saved check");
  }
  const createdAt = new Date(value.createdAt);
  if (Number.isNaN(createdAt.getTime())) throw new Error("Invalid check date");
  return {
    id: value.id,
    targetUrl: value.targetUrl,
    status: value.status as Run["status"],
    createdAt,
    responseBody: value.responseBody ?? null,
    detectedSchema: value.detectedSchema ?? null,
    diff: value.diff ?? null,
    errorMessage:
      typeof value.errorMessage === "string" ? value.errorMessage : null,
  };
}

// Only update from a successful API response. A changed target does not rewrite
// history, and accepting a response does not turn an old FAIL into a PASS.
export function applySavedResult(
  current: Endpoint,
  action: EndpointAction,
  value: unknown,
): Endpoint {
  if (
    !isRecord(value) ||
    !isRecord(value.endpoint) ||
    value.endpoint.id !== current.id
  ) {
    throw new Error("Invalid saved endpoint");
  }
  const endpoint = value.endpoint;
  if (action === "save") {
    if (
      typeof endpoint.name !== "string" ||
      typeof endpoint.url !== "string" ||
      typeof endpoint.method !== "string"
    ) {
      throw new Error("Invalid saved configuration");
    }
    return {
      ...current,
      name: endpoint.name,
      url: endpoint.url,
      method: endpoint.method,
    };
  }
  if (!("baselineExample" in endpoint) || !("baselineSchema" in endpoint)) {
    throw new Error("Missing saved baseline");
  }
  const baseline = {
    baselineExample: endpoint.baselineExample,
    baselineSchema: endpoint.baselineSchema,
  };
  if (action === "accept") return { ...current, ...baseline };

  if (action === "run") {
    const run = readRun(value.testRun);
    return {
      ...current,
      ...baseline,
      testRuns: [
        run,
        ...current.testRuns.filter((previous) => previous.id !== run.id),
      ].slice(0, 5),
    };
  }
  throw new Error("Unsupported endpoint action");
}
