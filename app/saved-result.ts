import type { DashboardEndpoint, DashboardTestRun } from "./dashboard-types";
import type { EndpointAction } from "./endpoint-actions";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRun(value: unknown): DashboardTestRun {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.createdAt !== "string" ||
    // Runs saved before targetUrl was introduced may contain null.
    (value.targetUrl !== null && typeof value.targetUrl !== "string") ||
    typeof value.status !== "string" ||
    !["BASELINE_CREATED", "PASS", "FAIL", "ERROR"].includes(value.status)
  ) {
    throw new Error("Invalid saved check");
  }
  const createdAt = new Date(value.createdAt);
  if (Number.isNaN(createdAt.getTime())) throw new Error("Invalid check date");
  return {
    id: value.id,
    targetUrl: value.targetUrl,
    status: value.status as DashboardTestRun["status"],
    createdAt,
    responseBody: value.responseBody ?? null,
    detectedSchema: value.detectedSchema ?? null,
    diff: value.diff ?? null,
    errorMessage:
      typeof value.errorMessage === "string" ? value.errorMessage : null,
    aiExplanation:
      typeof value.aiExplanation === "string" ? value.aiExplanation : null,
  };
}

// Only update from a successful API response. A changed target does not rewrite
// history, and accepting a response does not turn an old FAIL into a PASS.
export function applySavedResult(
  current: DashboardEndpoint,
  action: EndpointAction,
  value: unknown,
): DashboardEndpoint {
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
  if (
    endpoint.baselineSourceUrl !== null &&
    typeof endpoint.baselineSourceUrl !== "string"
  ) {
    throw new Error("Invalid baseline source");
  }
  const baseline = {
    baselineExample: endpoint.baselineExample,
    baselineSchema: endpoint.baselineSchema,
    baselineSourceUrl: endpoint.baselineSourceUrl,
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

export function addExplanationToRun(
  current: DashboardEndpoint,
  runId: string,
  explanation: string,
): DashboardEndpoint {
  return {
    ...current,
    testRuns: current.testRuns.map((run) => {
      if (run.id !== runId) {
        return run;
      }

      return {
        ...run,
        aiExplanation: explanation,
      };
    }),
  };
}
