# The three tasks for the health-check experiment, approved before any run.
# Sourced by scripts/run-health-experiment.sh.
#
# A run is correct when the change is present (checked below), and
# `npx tsc --noEmit` and `npm test` both pass afterwards.

TASK_1='In app/dashboard-types.ts, rename the aiExplanation field of DashboardTestRun to impactNote. Keep the database column name as it is.'
TASK_2='Change formatDiff in lib/contractlens/format-diff.ts to return objects of the form { path, message } instead of plain strings.'
TASK_3='In lib/contractlens/compare-responses.ts, rename the counts property of the result to summary.'

# Prints "yes" if task $1's change is present in the current folder.
change_present() {
  case "$1" in
    1)
      # DashboardTestRun has impactNote and no longer has aiExplanation.
      node -e '
        const s = require("fs").readFileSync("app/dashboard-types.ts", "utf8");
        const block = s.slice(s.indexOf("DashboardTestRun"), s.indexOf("};", s.indexOf("DashboardTestRun")));
        console.log(/\bimpactNote\b/.test(block) && !/\baiExplanation\b/.test(block) ? "yes" : "no");
      ' ;;
    2)
      npx tsx -e '
        import { formatDiff } from "./lib/contractlens/format-diff";
        const [item] = formatDiff([{ type: "MISSING_FIELD", path: "title", severity: "breaking" }]) as unknown[];
        const ok = typeof item === "object" && item !== null && "path" in item && "message" in item;
        console.log(ok ? "yes" : "no");
      ' 2>/dev/null || echo no ;;
    3)
      npx tsx -e '
        import { compareResponses } from "./lib/contractlens/compare-responses";
        const r = compareResponses({ a: 1 }, { a: "1" }) as Record<string, unknown>;
        console.log("summary" in r && !("counts" in r) ? "yes" : "no");
      ' 2>/dev/null || echo no ;;
  esac
}
