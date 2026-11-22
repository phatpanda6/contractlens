// Shared by both hooks: runs the type checker and tests, returns the summary
// for Claude ("" when everything passed), and optionally logs that it ran.
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import path from "node:path";
import { formatSummary, parseTestFailures, parseTypeErrors } from "./summary.mjs";

/**
 * @param {string} cwd the project folder
 * @param {string | null} relatedFile run only tests related to this file, or all tests when null
 */
export function runChecks(cwd, relatedFile) {
  const typeCheck = spawnSync("npx", ["tsc", "--noEmit", "--pretty", "false"], {
    cwd,
    encoding: "utf8",
    timeout: 60_000,
  });

  const testArgs = relatedFile
    ? ["vitest", "related", path.resolve(cwd, relatedFile), "--run", "--reporter=json"]
    : ["vitest", "run", "--reporter=json"];
  const tests = spawnSync("npx", testArgs, { cwd, encoding: "utf8", timeout: 120_000 });

  let report = null;
  try {
    const out = tests.stdout ?? "";
    report = JSON.parse(out.slice(out.indexOf("{")));
  } catch {
    report = null;
  }

  return formatSummary({
    typeErrors: parseTypeErrors(typeCheck.stdout ?? ""),
    testFailures: parseTestFailures(report, cwd),
  });
}

// The experiment sets HEALTH_CHECK_LOG to a file outside the project, so it
// can count how often each hook ran and whether it found problems.
export function logRun(hookName, summary) {
  const logFile = process.env.HEALTH_CHECK_LOG;
  if (!logFile) return;
  const outcome = summary ? "problems" : "clean";
  appendFileSync(logFile, `${new Date().toISOString()}\t${hookName}\t${outcome}\n`);
}
