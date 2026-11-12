import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isolateChanges } from "../lib/contractlens";
import {
  EXIT_INVALID_INPUT,
  InvalidInputError,
  readJsonFile,
  type CliResult,
} from "./compare-cli";

export const EXIT_DONE = 0;

const USAGE =
  "Usage: npm run isolate -- <baseline.json> <latest.json> --out <folder>";

// Turns a field path such as "testRun.createdAt" into a safe file name part.
function fileNamePart(fieldPath: string): string {
  return fieldPath.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "root";
}

// Writes one response file per detected change: the baseline with only that
// change applied. Prints a JSON list saying which file belongs to which field.
export function runIsolateCli(args: string[]): CliResult {
  try {
    const outIndex = args.indexOf("--out");
    const outDir = outIndex === -1 ? undefined : args[outIndex + 1];
    // Everything except "--out <folder>" should be the two input files.
    const rest = args.filter(
      (_, index) => index !== outIndex && index !== outIndex + 1,
    );
    const unknownFlag = rest.find((arg) => arg.startsWith("--"));

    if (unknownFlag) {
      throw new InvalidInputError(`Unknown option: ${unknownFlag}`);
    }
    if (!outDir || outDir.startsWith("--")) {
      throw new InvalidInputError("Expected --out <folder>.");
    }
    if (rest.length !== 2) {
      throw new InvalidInputError("Expected exactly two files.");
    }

    const changes = isolateChanges(readJsonFile(rest[0]), readJsonFile(rest[1]));

    mkdirSync(outDir, { recursive: true });

    const list = changes.map((change, index) => {
      const { path: fieldPath, type, severity } = change.diff;
      if (!change.isolated) {
        return { path: fieldPath, type, severity, file: null, reason: change.reason };
      }
      // The number keeps names unique and in the compare command's order.
      const file = path.join(
        outDir,
        `${index + 1}-${fileNamePart(fieldPath)}.json`,
      );
      writeFileSync(file, `${JSON.stringify(change.response, null, 2)}\n`);
      return { path: fieldPath, type, severity, file };
    });

    return {
      exitCode: EXIT_DONE,
      stdout: JSON.stringify({ changes: list }, null, 2),
      stderr: "",
    };
  } catch (error) {
    // As in the compare command, every failure is reported as invalid input
    // rather than left to crash with Node's default exit code.
    const message =
      error instanceof InvalidInputError
        ? `${error.message}\n${USAGE}`
        : `Unexpected error: ${String(error)}`;
    return { exitCode: EXIT_INVALID_INPUT, stdout: "", stderr: message };
  }
}
