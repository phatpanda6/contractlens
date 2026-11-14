# Trying the skill on real code

The [first comparison](../skill-comparison/README.md) used a small example
built for the purpose. This trial runs the `api-change-investigation` skill,
and plain Claude Code, on real code: ContractLens's own web app.

Short version: on this trial plain Claude gave the more useful answer. The
skill was careful and consistent, but its rules stopped it from saying which
changes actually break the code.

This is three runs per side on one made-up change. It does not prove anything
in general.

## Setup

- Date: 2026-11-12. Claude Code 2.1.322, model `claude-fable-5-2`, all six
  runs. (The first comparison used `claude-opus-5-5`, so the two write-ups are
  not directly comparable.)
- **Consumer:** the `app/` folder, about 2,000 lines. When "Run check"
  returns, the dashboard passes the response to `applySavedResult` in
  `app/saved-result.ts`, which validates it and throws if it looks wrong.
- **Baseline response:** [`fixtures/run-response-v1.json`](fixtures/run-response-v1.json).
  A real failed check and its endpoint, read from a local development
  database and saved in the form the run route returns.
- **Changed response:** [`fixtures/run-response-v2.json`](fixtures/run-response-v2.json).
  The baseline with five made-up edits (below).
- **Test:** `app/saved-result.response.test.ts` was added for this trial. It
  loads a response file and passes it to `applySavedResult`. The web app had
  no test that runs against a response file before this.
- Each run was a new `claude -p` session in a clean copy of the repository
  with `CLAUDE.md`, `README.md` and the write-ups under `docs/` removed. The
  "without" copies also had no `.claude/` folder. Sessions could read, search
  and run commands; edit tools were not allowed.
- Script: `scripts/run-skill-comparison.sh` with `V1`, `V2`, `FOLDER`,
  `API_NAME` and `TEST_CMD` set. Saved answers: [`runs/`](runs/).

Prompt without the skill:

> The run-check API response changed. Old response:
> docs/real-codebase-trial/fixtures/run-response-v1.json. New response:
> docs/real-codebase-trial/fixtures/run-response-v2.json. Does this change
> break the code in app?

Prompt with the skill:

> Use the api-change-investigation skill. Baseline: (v1 path). Latest: (v2
> path). Consumer folder: app. Test command: RUN_RESPONSE_FIXTURE={response}
> npx vitest run app/saved-result.response.test.ts

## The change and the answer key

The answer key was written before the runs, by reading the code and running
the test with each edit on its own.

| Field | Edit | What the code does | Answer |
|---|---|---|---|
| `endpoint.baselineSourceUrl` | string -> object | throws `Invalid baseline source` (`app/saved-result.ts:74`) | really broken |
| `testRun.createdAt` | string -> number | throws `Invalid saved check` (`app/saved-result.ts:18`), but only once the first break is out of the way | really broken |
| `testRun.errorMessage` | `null` -> missing | falls back to `null` (`app/saved-result.ts:31`); the test passes with only this edit | read, but safe |
| `endpoint.projectId` | string -> number | nothing in `app/` reads it from this response | no usage |
| `testRun.durationMs` | added | ignored | added only |

With all five edits, the test fails at the first break and never reaches
`createdAt`.

## Results

| Question | Without the skill (3 runs) | With the skill (3 runs) |
|---|---|---|
| Ran the test on both responses | 3 of 3 | 3 of 3 |
| Cited file and line | 3 of 3 | 3 of 3 |
| Changed or tried to change files | 0 of 3 | 0 of 3 |
| `baselineSourceUrl` reported as broken | 3 of 3 | 3 of 3 (confirmed broken) |
| `createdAt` reported as broken | 3 of 3, from reading the code | 0 of 3 (may be affected) |
| `errorMessage` reported as safe here | 3 of 3 | 0 of 3 (may be affected) |
| `projectId` reported as unused | 3 of 3 | 3 of 3 |
| Matched the answer key on all five fields | 3 of 3 | 0 of 3 |
| Said something was broken that is not | 0 of 3 | 0 of 3 |
| Said which claims a test did not prove | 3 of 3 | 3 of 3 |
| Listed the dashboard lines that use each field | 0 of 3 | 3 of 3 |
| Suggested fixes without being asked | 3 of 3 | 0 of 3 |
| Same findings across the 3 runs | yes | yes |
| Turns per run | 13, 12, 13 | 9, 9, 9 |

## What this shows

**Plain Claude was more useful here.** Every run read the validation code,
found both real breaks with the right lines, explained that the second is
hidden behind the first, and correctly said the missing `errorMessage` is
handled. It also described what the user would see: the check is saved, but
the dashboard shows "The saved result could not be displayed". It did not
overclaim: each run said which break the test showed and which came from
reading the code.

**The skill was cautious to the point of being less informative.** It put
`createdAt` (a real break) and `errorMessage` (harmless) under the same "may
be affected" label. A reader of the skill's report cannot tell them apart
without reading the code themselves.

**What the skill did do better:** it listed every dashboard line that uses
each field, used the same report every time, said exactly what was not
checked, and took fewer turns. It never called a safe change broken, but
neither did plain Claude.

## Weaknesses this exposed in the skill

1. **"May be affected" is too coarse.** It covers both "the code rejects this
   value" and "the code tolerates this value".
2. **One test, one failure.** A test stops at its first error, so a second
   break behind it cannot be confirmed. The skill has no step for testing one
   change at a time.
3. **The "error must name the field" rule is ambiguous on real errors.** The
   message was `Invalid baseline source`, not the field's name. All three runs
   counted it as confirmed and said why, which is reasonable but not what the
   rule literally says.
4. **It needs a test that takes a response file.** The web app did not have
   one. Writing it was extra work that plain Claude did not need: one earlier
   setup-check run made its own temporary response file to prove the second
   break.

A possible improvement, not done here: have the skill apply each changed
field to the baseline one at a time and run the test for each. That would
confirm `createdAt` and show `errorMessage` passing.

## Limits

- Three runs per side, one model, one day.
- The consumer is the author's own project, not a third-party API.
- The change is made up, and the test was added for this trial.
- Claude wrote the answer key and scored the runs, in the session that wrote
  the skill. The saved answers in [`runs/`](runs/) let anyone check the table.
- The "with" prompt was given the test command. The "without" sessions found
  the test file on their own.
- The first three "with" runs were discarded and re-run: a quoting mistake in
  the script had appended a stray fragment to the test command. Those sessions
  ignored the fragment and reached the same findings as the re-runs reported
  here.
- One extra "without" run was made first to check the setup. It is not
  counted. It reached the same findings and also proved the `createdAt` break
  with a temporary file.
- In the saved answers, local file paths are replaced with `<copy>`.

## After the improvement

The skill was then changed to test each changed field on its own. A new
command, `npm run isolate`, writes one response file per change (the baseline
with only that change applied), and the skill runs the test against each
file. A fifth label, "Test still passes", was added, and the "error must name
the field" rule was removed.

The label "Test still passes" was later renamed "Used, but test passes" and
the report wording was simplified. The results and saved runs here use the
old name. One fresh run after the rewording (`claude-fable-5-2`) gave the same
finding for all five fields: [`runs-reworded/`](runs-reworded/). One run
checks that the rewording changed nothing; it is not a new measurement.

The bar was set before the runs: in 3 of 3 fresh runs, match the answer key
on all five fields, and back every "broken" and "test still passes" verdict
with a test run on that field alone.

Three fresh runs with the improved skill, same model (`claude-fable-5-2`),
same prompt. Saved answers: [`runs-improved/`](runs-improved/).

| Question | Plain Claude (earlier) | Skill before | Skill after |
|---|---|---|---|
| Matched the answer key on all five fields | 3 of 3 | 0 of 3 | 3 of 3 |
| `createdAt` break shown by a test run | 0 of 3 (read from the code) | 0 of 3 | 3 of 3 |
| `errorMessage` shown to pass a test on its own | 0 of 3 (read from the code) | 0 of 3 | 3 of 3 |
| Said something was broken that is not | 0 of 3 | 0 of 3 | 0 of 3 |
| Changed repository files | 0 of 3 | 0 of 3 | 0 of 3 |
| Turns per run | 13, 12, 13 | 9, 9, 9 | 6, 9, 7 |

The improved skill cleared the bar. It now reaches the same conclusions as
plain Claude, and each one is backed by a test run on that field alone,
including the second break that the full test run hides.

What this does and does not show:

- Plain Claude was already right on every field. The improvement adds proof,
  not a different answer.
- **The improvement was designed from this trial and then measured on the
  same trial.** That makes this a check that the fix works, not an
  independent test. A fair test needs a different codebase and change.
- "Test still passes" depends on the test. The trial's test checks only that
  the run is accepted, and all three runs said so.
- Plain Claude's runs were not repeated, and one earlier setup-check run of
  plain Claude also proved the `createdAt` break by making its own temporary
  file.
- Claude scored these runs too.
