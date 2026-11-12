import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import type { DashboardEndpoint } from "./dashboard-types";
import { applySavedResult } from "./saved-result";

// Which saved "run check" response to test against. Defaults to the unchanged
// response so `npm test` passes. Set RUN_RESPONSE_FIXTURE to another file path
// to run the same test against it.
const defaultFixture = fileURLToPath(
  new URL(
    "../docs/real-codebase-trial/fixtures/run-response-v1.json",
    import.meta.url,
  ),
);
const fixturePath = process.env.RUN_RESPONSE_FIXTURE ?? defaultFixture;

// The endpoint the dashboard is showing before the response arrives.
const current: DashboardEndpoint = {
  id: "cmqacyvdz00014m8ozfpq7y08",
  name: "Demo Products API",
  method: "GET",
  url: "/api/demo/products/v2",
  baselineSchema: null,
  baselineExample: null,
  baselineSourceUrl: null,
  testRuns: [],
};

it("accepts a saved run-check response", () => {
  const response = JSON.parse(readFileSync(fixturePath, "utf8"));

  // The same call the dashboard makes when "Run check" returns.
  const updated = applySavedResult(current, "run", response);

  expect(updated.testRuns).toHaveLength(1);
  expect(updated.testRuns[0].id).toBe("cmwcvr9mc0001pb8orj5ea59s");
});
