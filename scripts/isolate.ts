import { runIsolateCli } from "./isolate-cli";

// Entry point for `npm run isolate`: run the logic, print, set the exit code.
const { exitCode, stdout, stderr } = runIsolateCli(process.argv.slice(2));

if (stdout) console.log(stdout);
if (stderr) console.error(stderr);
process.exitCode = exitCode;
