import { compareSchemas } from "./compare-schemas";
import { inferSchema } from "./infer-schema";
import type { SchemaDiff } from "./types";

// The overall answer for one comparison. Identical responses also count as
// "no_breaking_changes"; counts.total is 0 in that case.
export type CompareVerdict = "breaking" | "no_breaking_changes";

export type CompareResult = {
  verdict: CompareVerdict;
  counts: { breaking: number; info: number; total: number };
  diffs: SchemaDiff[];
};

// Compares two already-parsed API responses and summarises the result.
// Pure: no file access, no printing, so it can be reused by the CLI, the web
// app or a test without any setup.
export function compareResponses(
  baseline: unknown,
  latest: unknown,
): CompareResult {
  // Reuse the existing engine: turn each response into its shape, then diff.
  const diffs = compareSchemas(inferSchema(baseline), inferSchema(latest));

  const breaking = diffs.filter((diff) => diff.severity === "breaking").length;
  const info = diffs.length - breaking;

  return {
    // One breaking diff is enough to make the whole comparison breaking.
    verdict: breaking > 0 ? "breaking" : "no_breaking_changes",
    counts: { breaking, info, total: diffs.length },
    diffs,
  };
}
