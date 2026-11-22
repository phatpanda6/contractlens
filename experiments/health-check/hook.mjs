// A Claude Code PostToolUse hook: runs after every file Claude edits with its
// Edit or Write tools. It runs the type checker and the tests related to the
// edited file. If both pass it stays silent. If not, it writes a short summary
// to stderr and exits with code 2, which Claude Code shows to Claude.
import { readFileSync } from "node:fs";
import { logRun, runChecks } from "./checks.mjs";

const CODE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs|mts)$/;

const input = JSON.parse(readFileSync(0, "utf8"));
const file = input?.tool_input?.file_path;
const cwd = input?.cwd || process.cwd();

// Only code files inside the project are worth checking.
if (!file || !CODE_FILE.test(file) || file.includes("node_modules")) {
  process.exit(0);
}

const summary = runChecks(cwd, file);
logRun("after-edit", summary);

if (summary) {
  process.stderr.write(summary + "\n");
  process.exit(2);
}
process.exit(0);
