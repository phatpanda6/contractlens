// Turns raw type-checker and test output into a short summary for Claude.
// Kept separate from hook.mjs so it can be unit tested without running tools.

// tsc --pretty false prints one line per error, for example:
// app/page.tsx(12,5): error TS2339: Property 'x' does not exist on type 'Y'.
const TSC_LINE = /^(.+?)\((\d+),\d+\): error TS\d+: (.*)$/;

/** @returns {{ file: string, line: number, message: string }[]} */
export function parseTypeErrors(text) {
  return text
    .split("\n")
    .map((line) => TSC_LINE.exec(line.trim()))
    .filter(Boolean)
    .map(([, file, line, message]) => ({ file, line: Number(line), message }));
}

/**
 * Reads Vitest's JSON report and returns one entry per failed test.
 * @param {unknown} report
 * @param {string} cwd used to shorten absolute test file paths
 * @returns {{ file: string, test: string, message: string }[]}
 */
export function parseTestFailures(report, cwd) {
  if (!report || typeof report !== "object" || !Array.isArray(report.testResults)) {
    return [];
  }
  const failures = [];
  for (const fileResult of report.testResults) {
    const file = shorten(String(fileResult.name ?? ""), cwd);
    const assertions = Array.isArray(fileResult.assertionResults)
      ? fileResult.assertionResults
      : [];
    const failed = assertions.filter((a) => a.status === "failed");
    for (const assertion of failed) {
      failures.push({
        file,
        test: String(assertion.fullName ?? assertion.title ?? "test"),
        message: firstLine(assertion.failureMessages?.[0]),
      });
    }
    // A file can fail before any test runs, for example on a broken import.
    if (failed.length === 0 && fileResult.status === "failed") {
      failures.push({ file, test: "(file)", message: firstLine(fileResult.message) });
    }
  }
  return failures;
}

/**
 * Builds the text Claude sees. Empty string means everything passed.
 * @param {{ typeErrors: ReturnType<typeof parseTypeErrors>, testFailures: ReturnType<typeof parseTestFailures> }} result
 * @param {number} limit the most lines to show per section
 */
export function formatSummary({ typeErrors, testFailures }, limit = 8) {
  if (typeErrors.length === 0 && testFailures.length === 0) return "";

  const lines = ["Automatic check after your edit found problems:"];
  if (typeErrors.length > 0) {
    lines.push(`Type errors (${typeErrors.length}):`);
    for (const e of typeErrors.slice(0, limit)) {
      lines.push(`- ${e.file}:${e.line} ${e.message}`);
    }
    if (typeErrors.length > limit) lines.push(`- ...and ${typeErrors.length - limit} more`);
  }
  if (testFailures.length > 0) {
    lines.push(`Failing tests (${testFailures.length}):`);
    for (const f of testFailures.slice(0, limit)) {
      lines.push(`- ${f.file} > ${f.test}: ${f.message}`);
    }
    if (testFailures.length > limit) lines.push(`- ...and ${testFailures.length - limit} more`);
  }
  return lines.join("\n");
}

function shorten(file, cwd) {
  return cwd && file.startsWith(cwd + "/") ? file.slice(cwd.length + 1) : file;
}

function firstLine(text) {
  const line = String(text ?? "").split("\n").find((l) => l.trim() !== "");
  return (line ?? "").trim().slice(0, 200);
}
