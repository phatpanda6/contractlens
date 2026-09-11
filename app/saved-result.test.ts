import { describe, expect, it } from "vitest";
import { applySavedResult } from "./saved-result";
import type { DashboardProject } from "./dashboard";

const failedRun = {
  id: "run-1",
  targetUrl: "/api/demo/products/v2",
  status: "FAIL" as const,
  createdAt: new Date("2026-09-10T00:00:00Z"),
  responseBody: { price: "10" },
  detectedSchema: { price: "string" },
  diff: [
    {
      type: "TYPE_CHANGED",
      path: "price",
      from: "number",
      to: "string",
      severity: "breaking",
    },
  ],
  errorMessage: null,
};
const endpoint: DashboardProject["endpoints"][number] = {
  id: "endpoint-1",
  name: "Products",
  method: "GET",
  url: "/api/demo/products/v2",
  baselineExample: { price: 10 },
  baselineSchema: { price: "number" },
  testRuns: [failedRun],
};

describe("saved dashboard results", () => {
  it("preserves the recorded target and baseline when configuration is saved", () => {
    const result = applySavedResult(endpoint, "save", {
      endpoint: {
        id: endpoint.id,
        name: "Renamed",
        method: "GET",
        url: "/api/demo/products/v1",
      },
    });
    expect(result.url).toBe("/api/demo/products/v1");
    expect(result.testRuns[0].targetUrl).toBe("/api/demo/products/v2");
    expect(result.baselineExample).toEqual({ price: 10 });
    expect(endpoint.url).toBe("/api/demo/products/v2");
  });

  it("accepts the saved baseline without changing the old failure", () => {
    const result = applySavedResult(endpoint, "accept", {
      endpoint: {
        id: endpoint.id,
        baselineExample: failedRun.responseBody,
        baselineSchema: failedRun.detectedSchema,
      },
    });
    expect(result.baselineExample).toEqual({ price: "10" });
    expect(result.testRuns[0].status).toBe("FAIL");
    expect(result.testRuns[0].diff).toEqual(failedRun.diff);
  });

  it("shows a persisted error as the latest check and retains earlier history", () => {
    const result = applySavedResult(endpoint, "run", {
      endpoint,
      testRun: {
        id: "error-run",
        targetUrl: endpoint.url,
        status: "ERROR",
        createdAt: "2026-09-10T01:00:00Z",
        errorMessage: "Endpoint request timed out",
        responseBody: null,
        detectedSchema: null,
        diff: null,
      },
    });
    expect(result.testRuns.map((run) => run.status)).toEqual(["ERROR", "FAIL"]);
    expect(result.testRuns[0].createdAt).toEqual(
      new Date("2026-09-10T01:00:00Z"),
    );
    expect(result.testRuns[0].responseBody).toBeNull();
    expect(result.baselineExample).toEqual(endpoint.baselineExample);
  });

  it("keeps five distinct saved runs and does not duplicate a repeated response", () => {
    const fullHistory = {
      ...endpoint,
      testRuns: Array.from({ length: 5 }, (_, i) => ({
        ...failedRun,
        id: `run-${i}`,
      })),
    };
    const result = applySavedResult(fullHistory, "run", {
      endpoint,
      testRun: {
        ...failedRun,
        id: "run-0",
        createdAt: failedRun.createdAt.toISOString(),
      },
    });
    expect(result.testRuns.map((run) => run.id)).toEqual([
      "run-0",
      "run-1",
      "run-2",
      "run-3",
      "run-4",
    ]);
  });

  it("rejects an invalid result instead of displaying an invented successful check", () => {
    expect(() =>
      applySavedResult(endpoint, "run", {
        endpoint,
        testRun: { status: "PASS" },
      }),
    ).toThrow("Invalid saved check");
    expect(() =>
      applySavedResult(endpoint, "save", { endpoint: { id: "someone-else" } }),
    ).toThrow("Invalid saved endpoint");
    expect(endpoint.testRuns[0].status).toBe("FAIL");
  });
});
