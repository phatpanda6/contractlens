import { readFileSync } from "node:fs";
import { compareResponses, formatDiff } from "../lib/contractlens";

// Exit codes are the contract other tools (CI, the investigation skill) rely on.
export const EXIT_NO_BREAKING = 0;
export const EXIT_BREAKING = 1;
export const EXIT_INVALID_INPUT = 2;

export type CliResult = { exitCode: number; stdout: string; stderr: string };

const USAGE = "Usage: npm run compare -- <baseline.json> <latest.json> [--json]";

// Thrown for anything wrong with what the user gave us (as opposed to a bug).
class InvalidInputError extends Error {}

function readJsonFile(path: string): unknown {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    throw new InvalidInputError(`Cannot read file: ${path}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new InvalidInputError(`File is not valid JSON: ${path}`);
  }
}

// All the command's logic lives here and returns its output instead of
// printing, so tests can call it directly without starting a new process.
export function runCompareCli(args: string[]): CliResult {
  try {
    const wantsJson = args.includes("--json");
    const unknownFlag = args.find(
      (arg) => arg.startsWith("--") && arg !== "--json",
    );
    const files = args.filter((arg) => !arg.startsWith("--"));

    if (unknownFlag) {
      throw new InvalidInputError(`Unknown option: ${unknownFlag}`);
    }
    if (files.length !== 2) {
      throw new InvalidInputError("Expected exactly two files.");
    }

    const result = compareResponses(
      readJsonFile(files[0]),
      readJsonFile(files[1]),
    );
    const exitCode =
      result.verdict === "breaking" ? EXIT_BREAKING : EXIT_NO_BREAKING;

    if (wantsJson) {
      return { exitCode, stdout: JSON.stringify(result, null, 2), stderr: "" };
    }

    const messages = formatDiff(result.diffs);
    const lines = [
      result.verdict === "breaking"
        ? "Breaking changes detected"
        : "No breaking changes detected",
      `${result.counts.breaking} breaking, ${result.counts.info} info`,
      // formatDiff returns one message per diff, in the same order.
      ...result.diffs.map(
        (diff, index) => `  [${diff.severity}] ${messages[index]}`,
      ),
    ];
    return { exitCode, stdout: lines.join("\n"), stderr: "" };
  } catch (error) {
    // Node exits with 1 on an uncaught error, which would look like
    // "breaking changes". Every failure is mapped to 2 here instead.
    const message =
      error instanceof InvalidInputError
        ? `${error.message}\n${USAGE}`
        : `Unexpected error: ${String(error)}`;
    return { exitCode: EXIT_INVALID_INPUT, stdout: "", stderr: message };
  }
}
