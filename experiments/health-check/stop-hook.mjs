// A Claude Code Stop hook: runs when Claude tries to finish. It runs the type
// checker and all unit tests, so it catches edits made any way, including
// from the terminal. If something fails, it exits with code 2 and the summary
// tells Claude why it should continue. Claude Code stops re-running a blocking
// Stop hook after several attempts in a row, so this cannot loop forever.
import { readFileSync } from "node:fs";
import { logRun, runChecks } from "./checks.mjs";

const input = JSON.parse(readFileSync(0, "utf8"));
const cwd = input?.cwd || process.cwd();

const summary = runChecks(cwd, null);
logRun("on-finish", summary);

if (summary) {
  process.stderr.write(
    summary.replace(
      "Automatic check after your edit found problems:",
      "Automatic check before finishing found problems:",
    ) + "\n",
  );
  process.exit(2);
}
process.exit(0);
