#!/usr/bin/env bash
# Runs the health-check experiment: the same coding tasks in fresh Claude
# Code sessions, with and without the automatic check hook, and records
# tokens, cost, turns, time and whether each run ended correct.
#
# Usage: scripts/run-health-experiment.sh <output-dir> [runs-per-side] [tasks] [sides]
#   output-dir     where copies and results go (use a folder outside the repo)
#   runs-per-side  default 3
#   tasks          space-separated task numbers, default "1 2 3"
#   sides          "with", "without" or "both" (default "both")
#
# Needs the `claude` command line tool, signed in. Each run uses Claude usage.
set -euo pipefail

OUT="${1:?Usage: scripts/run-health-experiment.sh <output-dir> [runs-per-side] [tasks] [sides]}"
RUNS="${2:-3}"
TASKS="${3:-1 2 3}"
SIDES="${4:-both}"
MODEL="${MODEL:-claude-opus-5-5}"

REPO="$(git rev-parse --show-toplevel)"
# shellcheck source=../experiments/health-check/tasks.sh
source "$REPO/experiments/health-check/tasks.sh"
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"
RESULTS="$OUT/results.tsv"
[ -f "$RESULTS" ] || printf 'run\ttask\tside\tcorrect\tchange\ttsc\ttests\tturns\tinput\toutput\tcache_read\tcache_write\tcost_usd\tseconds\tafter_edit_checks\ton_finish_checks\tchecks_with_problems\n' > "$RESULTS"

# Builds a clean copy of the working tree in $2 for side $1.
make_copy() {
  local side="$1" dest="$2"
  mkdir -p "$dest"
  (cd "$REPO" && git ls-files -co --exclude-standard -z | tar --null -T - -cf -) | tar -x -C "$dest"
  # Local notes would tell the session about the project and the experiment.
  rm -f "$dest/AGENTS.md" "$dest/CLAUDE.md" "$dest/HANDOFF.md" "$dest/FOUNDER.md" "$dest/MEETING.md"
  # The generated database client is ignored by git but needed to type check.
  cp -R "$REPO/lib/generated" "$dest/lib/generated"
  ln -s "$REPO/node_modules" "$dest/node_modules"
  if [ "$side" = "with" ]; then
    cp "$REPO/experiments/health-check/settings.json" "$dest/.claude/settings.json"
  else
    rm -rf "$dest/experiments"
  fi
}

run_one() {
  local task="$1" side="$2" n="$3"
  local name="task$task-$side-$n"
  local copy="$OUT/copies/$name"
  local prompt_var="TASK_$task"
  local prompt="${!prompt_var}"

  if [ -e "$copy" ]; then
    echo "Skipping $name (already exists)"
    return
  fi
  make_copy "$side" "$copy"

  echo "Running $name..."
  local start end
  start=$(date +%s)
  # The hooks append one line per check to this log (with side only).
  local log="$OUT/$name.hooks.log"
  : > "$log"
  (cd "$copy" && HEALTH_CHECK_LOG="$log" claude -p "$prompt" \
    --output-format stream-json --verbose \
    --model "$MODEL" \
    --allowedTools "Bash" "Read" "Grep" "Glob" "Edit" "Write" "MultiEdit" \
    < /dev/null > "$OUT/$name.jsonl" 2> "$OUT/$name.stderr") || echo "  $name exited with an error"
  end=$(date +%s)

  # Score the finished copy with plain code.
  local change tsc tests correct
  change=$(cd "$copy" && change_present "$task")
  if (cd "$copy" && npx tsc --noEmit > "$OUT/$name.tsc.txt" 2>&1); then tsc=pass; else tsc=fail; fi
  if (cd "$copy" && npx vitest run > "$OUT/$name.tests.txt" 2>&1); then tests=pass; else tests=fail; fi
  if [ "$change" = yes ] && [ "$tsc" = pass ] && [ "$tests" = pass ]; then correct=yes; else correct=no; fi

  python3 - "$OUT/$name.jsonl" "$name" "$task" "$side" "$correct" "$change" "$tsc" "$tests" "$((end - start))" "$log" >> "$RESULTS" <<'EOF'
import json, sys
path, name, task, side, correct, change, tsc, tests, seconds, log = sys.argv[1:]
result = {}
for line in open(path):
    try:
        o = json.loads(line)
    except Exception:
        continue
    if o.get("type") == "result":
        result = o
checks = [l.split("\t") for l in open(log).read().splitlines() if l]
after_edit = sum(1 for c in checks if c[1] == "after-edit")
on_finish = sum(1 for c in checks if c[1] == "on-finish")
problems = sum(1 for c in checks if c[2] == "problems")
u = result.get("usage") or {}
row = [name, task, side, correct, change, tsc, tests, result.get("num_turns", ""),
       u.get("input_tokens", ""), u.get("output_tokens", ""),
       u.get("cache_read_input_tokens", ""), u.get("cache_creation_input_tokens", ""),
       result.get("total_cost_usd", ""), seconds, after_edit, on_finish, problems]
print("\t".join(str(x) for x in row))
EOF
  tail -1 "$RESULTS"
}

for n in $(seq 1 "$RUNS"); do
  for task in $TASKS; do
    if [ "$SIDES" = "both" ] || [ "$SIDES" = "without" ]; then run_one "$task" without "$n"; fi
    if [ "$SIDES" = "both" ] || [ "$SIDES" = "with" ]; then run_one "$task" with "$n"; fi
  done
done

echo "Done. Results are in $RESULTS"
