# Does an automatic check make Claude more token efficient?

**Short answer: no.** With the check, Claude was correct just as often, but
used about 6% more tokens and 7% more money. The bar set before the runs was
at least 20% fewer tokens, so the idea was not supported.

## Why this was tested

After seeing the API change skill, a startup founder said it was close to
obsolete: Claude usually notices and fixes a broken API by itself while it
works. He suggested two things instead:

- prevent breaks as they happen, not detect them later; and
- make token efficiency the reason to use the tool: fixing problems with
  fewer tokens than plain Claude.

This experiment tests that idea before building anything around it.

## What was tested

A Claude Code hook, a small script that runs by itself:

- **after every edit** Claude makes with its Edit or Write tools, it runs the
  type checker and the tests related to the edited file; and
- **when Claude tries to finish**, it runs the type checker and all unit
  tests. This catches edits made from the terminal, which the first check
  misses.

If everything passes it stays silent. If not, it gives Claude a short summary,
one line per problem, instead of the full output.

Code: [`experiments/health-check/`](../../experiments/health-check/). Run
script: [`scripts/run-health-experiment.sh`](../../scripts/run-health-experiment.sh).

## Setup

- **Codebase:** this repository's web app, in a fresh copy for every run.
- **Tasks:** three normal requests whose obvious edit breaks code elsewhere.
  Chosen and approved before any run.
  1. Rename the `aiExplanation` field of `DashboardTestRun` to `impactNote`,
     keeping the database column name.
  2. Make `formatDiff` return `{ path, message }` objects instead of strings.
  3. Rename the `counts` property of `compareResponses`'s result to `summary`.
- **Correct** means the change was made, and `npx tsc --noEmit` and the full
  unit test suite pass afterwards. Scored by code, not by judgement.
- **Runs:** 3 per task per side, 18 in total, each a fresh `claude -p`
  session, model `claude-opus-5-5`, same prompt on both sides.
- **The bar, set before the runs:** the hook side must be correct at least
  as often, and use at least 20% fewer tokens on average.

## Results

| | Without the hook | With the hook |
|---|---|---|
| Correct | 9 of 9 | 9 of 9 |
| Average tokens | 288,835 | 305,255 (**+5.7%**) |
| Average cost | $0.341 | $0.365 (+7%) |
| Average turns | 12.0 | 13.7 |
| Median time | 46 s | 44 s |

By task (averages of 3 runs):

| Task | Tokens without | Tokens with | Cost without | Cost with |
|---|---|---|---|---|
| 1. Rename a type field | 324,614 | 334,160 | $0.402 | $0.430 |
| 2. Change `formatDiff`'s output | 299,278 | 302,168 | $0.344 | $0.354 |
| 3. Rename `counts` | 242,612 | 279,438 | $0.277 | $0.310 |

Every number comes from [`runs/results.tsv`](runs/results.tsv). The hook
logs in [`runs/`](runs/) show when each check ran and whether it found
problems. Full session transcripts were kept locally and are not committed.

**Bar cleared: no.** Correctness was equal; tokens went up, not down.

## Why it didn't help

- **Plain Claude already prevents these breaks.** In every run without the
  hook, Claude searched for every use of the thing it was changing before
  editing, then updated all of them. All 9 were correct.
- **Checking after every edit mostly reported half-finished work.** In a
  rename across five files, the code is broken until the last file is done.
  The hook said so after each edit (32 of 39 after-edit checks found
  problems), and each message added a turn that re-read the conversation.
- **The check at the end found nothing.** It ran once in each of the 9 hook
  runs and every time the code was already correct.

## Where Claude's tokens actually go

To see if there was a better place to save tokens, I measured the 11 saved
Claude Code sessions of this project's own development (about 500 calls to
Claude, each message counted once).

| Billed tokens by kind | Share |
|---|---|
| Re-reading the conversation so far (cache reads) | 97% |
| Writing new content into the cache | 2.7% |
| Claude's output | 0.3% |

What fills the conversation, by size: Claude's own tool calls (mostly file
contents it wrote) 36%, Claude's explanations 17%, reading and searching
files 14%, user and system text 9%, test output 3.7%, type check and lint
output 0.4%.

So almost all cost comes from **how many turns there are times how long the
conversation is**. Shortening error or test output, which is what the hook
did, touches a few percent at most. A tool that adds turns costs more.

## What this does not show

- Three tasks on one small codebase, one model. Bigger codebases or harder
  bugs might behave differently.
- The tasks were refactors where Claude naturally searches first. A task
  where breaks are harder to find by searching could favour a check.
- One hook run took 26 minutes. The checks themselves took 1 to 2 seconds
  each; the delay was between Claude's turns and did not repeat. Its cause is
  unknown. The median times above are not affected.
- The token breakdown comes from one person's long interactive sessions on
  this project. It is a strong pointer, not a general measurement.

## Conclusion

On this evidence the founder was right that plain Claude already handles
these breaks, and token efficiency through automatic checks is not a moat:
the checks added turns, and turns are what cost tokens.
