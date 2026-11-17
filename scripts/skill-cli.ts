import { EXIT_INVALID_INPUT, runCompareCli, type CliResult } from "./compare-cli";
import { runIsolateCli } from "./isolate-cli";

const USAGE = [
  "Usage:",
  "  contractlens.mjs compare <baseline.json> <latest.json> [--json]",
  "  contractlens.mjs isolate <baseline.json> <latest.json> --out <folder>",
].join("\n");

// One command with two subcommands, so the investigation skill can ship a
// single bundled file. The first argument picks the subcommand; the rest is
// passed to the same functions `npm run compare` and `npm run isolate` use.
export function runSkillCli(args: string[]): CliResult {
  const [subcommand, ...rest] = args;

  if (subcommand === "compare") return runCompareCli(rest);
  if (subcommand === "isolate") return runIsolateCli(rest);

  return {
    exitCode: EXIT_INVALID_INPUT,
    stdout: "",
    stderr: `Unknown command: ${subcommand ?? "(none)"}\n${USAGE}`,
  };
}
