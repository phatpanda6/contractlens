import { runCompareCli } from "./compare-cli";

// Entry point for `npm run compare`. Kept tiny: run the logic, print, set the
// exit code. process.argv.slice(2) drops "node" and the script path.
const { exitCode, stdout, stderr } = runCompareCli(process.argv.slice(2));

if (stdout) console.log(stdout);
if (stderr) console.error(stderr);
process.exitCode = exitCode;
