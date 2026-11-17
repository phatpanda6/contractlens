import { runSkillCli } from "./skill-cli";

// Entry point that gets bundled into the skill's contractlens.mjs.
// Run the logic, print, set the exit code.
const { exitCode, stdout, stderr } = runSkillCli(process.argv.slice(2));

if (stdout) console.log(stdout);
if (stderr) console.error(stderr);
process.exitCode = exitCode;
