#!/usr/bin/env bash
# Runs the demo investigation in fresh Claude Code sessions, with and without
# the api-change-investigation skill, and saves what each session did.
#
# Usage: scripts/run-skill-comparison.sh <output-dir> [runs-per-side] [side]
#   output-dir     where copies and transcripts go (use a folder outside the repo)
#   runs-per-side  default 3
#   side           "with", "without" or "both" (default "both")
#
# Needs the `claude` command line tool, signed in. Each run uses Claude usage.
set -euo pipefail

OUT="${1:?Usage: scripts/run-skill-comparison.sh <output-dir> [runs-per-side] [side]}"
RUNS="${2:-3}"
SIDE="${3:-both}"

REPO="$(git rev-parse --show-toplevel)"
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"

# The inputs default to the demo. Set these variables to try other files:
#   V1, V2     baseline and latest response files
#   FOLDER     the consumer folder
#   API_NAME   how the plain prompt names the API
#   TEST_CMD   test command, with {response} where the file path goes
V1="${V1:-examples/products-consumer/fixtures/product-v1.json}"
V2="${V2:-examples/products-consumer/fixtures/product-v2.json}"
FOLDER="${FOLDER:-examples/products-consumer}"
API_NAME="${API_NAME:-products}"
# Kept in its own variable: a "}" inside ${VAR:-default} would end the default early.
DEFAULT_TEST_CMD='PRODUCT_FIXTURE={response} npx vitest run examples/products-consumer'
TEST_CMD="${TEST_CMD:-$DEFAULT_TEST_CMD}"

PROMPT_WITHOUT="The $API_NAME API response changed. Old response: $V1. New response: $V2. Does this change break the code in $FOLDER?"
PROMPT_WITH="Use the api-change-investigation skill. Baseline: $V1. Latest: $V2. Consumer folder: $FOLDER. Test command: $TEST_CMD"

# Builds a clean copy of the repo's working tree in $2 for side $1.
make_copy() {
  local side="$1" dest="$2"
  rm -rf "$dest"
  mkdir -p "$dest"
  # Tracked files plus new files that are not ignored, so local notes,
  # dependencies and build output are left out.
  (cd "$REPO" && git ls-files -co --exclude-standard -z | tar --null -T - -cf -) | tar -x -C "$dest"
  # These files describe the labels and the expected result.
  rm -f "$dest/AGENTS.md" "$dest/CLAUDE.md" "$dest/HANDOFF.md" "$dest/README.md"
  # Write-ups and saved answers from earlier runs would give the answers away.
  # Fixture files under docs/ are kept.
  if [ -d "$dest/docs" ]; then
    find "$dest/docs" -name '*.md' -delete
    find "$dest/docs" -type d -name runs -prune -exec rm -rf {} +
  fi
  if [ "$side" = "without" ]; then
    rm -rf "$dest/.claude"
  fi
}

run_one() {
  local side="$1" n="$2" prompt="$3"
  local name="$side-$n"
  local copy="$OUT/copies/$name" pristine="$OUT/copies/$name-pristine"

  make_copy "$side" "$pristine"
  make_copy "$side" "$copy"
  # Dependencies are shared so each copy can run the tests.
  ln -s "$REPO/node_modules" "$copy/node_modules"

  echo "Running $name..."
  # stream-json records every command the session ran, not only its answer.
  # Edit and Write are not allowed; an attempt shows up as a denied tool call.
  (cd "$copy" && claude -p "$prompt" \
    --output-format stream-json --verbose \
    --allowedTools "Bash" "Read" "Grep" "Glob" "Skill" \
    ${MODEL:+--model "$MODEL"} \
    < /dev/null > "$OUT/$name.jsonl" 2> "$OUT/$name.stderr") || echo "  $name exited with an error"

  # Lists any file the session changed, added or removed.
  diff -rq "$pristine" "$copy" --exclude=node_modules > "$OUT/$name.changes" || true
  rm -rf "$pristine"
}

for n in $(seq 1 "$RUNS"); do
  if [ "$SIDE" = "both" ] || [ "$SIDE" = "without" ]; then
    run_one without "$n" "$PROMPT_WITHOUT"
  fi
  if [ "$SIDE" = "both" ] || [ "$SIDE" = "with" ]; then
    run_one with "$n" "$PROMPT_WITH"
  fi
done

echo "Done. Transcripts are in $OUT"
