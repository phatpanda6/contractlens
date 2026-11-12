# Claude with and without the investigation skill

A small, honest comparison: the same API change, investigated by fresh Claude
Code sessions with and without the `api-change-investigation` skill.

This is three runs per side on one small demo. It shows how the answers
differed in these runs. It does not prove the skill is better in general.

## Setup

- Date: 2026-11-12. Claude Code 2.1.322, model `claude-opus-5-5`, all six runs.
- Input: the demo fixtures and consumer in `examples/products-consumer/`.
- Each run was a new `claude -p` session in a clean copy of the committed
  repo, with `CLAUDE.md` removed. The "without" copies also had the `.claude/`
  folder removed, so the skill did not exist there.
- Sessions could read, search and run commands. Edit tools were not allowed.
- Script: `scripts/run-skill-comparison.sh`. Saved answers and tool calls:
  [`runs/`](runs/).

Prompt without the skill:

> The products API response changed. Old response:
> examples/products-consumer/fixtures/product-v1.json. New response:
> examples/products-consumer/fixtures/product-v2.json. Does this change break
> the code in examples/products-consumer?

Prompt with the skill:

> Use the api-change-investigation skill. Baseline:
> examples/products-consumer/fixtures/product-v1.json. Latest:
> examples/products-consumer/fixtures/product-v2.json. Consumer folder:
> examples/products-consumer. Test command: PRODUCT_FIXTURE={response} npx
> vitest run examples/products-consumer

## Results

| Question | Without the skill (3 runs) | With the skill (3 runs) |
|---|---|---|
| Ran the test on both responses | 3 of 3 | 3 of 3 |
| Cited file and line | 3 of 3 | 3 of 3 |
| Changed or tried to change files | 0 of 3 | 0 of 3 |
| `price` reported broken, with the test error | 3 of 3 | 3 of 3 |
| `inStock` reported as not used by this code | 3 of 3 | 3 of 3 |
| Described `title` and `name` as a rename | 3 of 3 | 0 of 3 |
| Stated `title` as broken without a test showing it | 3 of 3 | 0 of 3 |
| Separated proven from possible breaks | 0 of 3 | 3 of 3 |
| Used the deterministic compare command | 0 of 3 | 3 of 3 |
| Suggested fixes without being asked | 3 of 3 | 0 of 3 |
| Same findings per field across the 3 runs | yes | yes |
| Same report layout across the 3 runs | no | yes |
| Turns per run | 4, 5, 5 | 6, 7, 8 |

## What this shows

**Claude without the skill already did most of the job.** Every run found the
test, ran it against both responses, quoted the real error, cited
`format-product.ts:12`, noticed that `inStock` is not used, and changed no
files. The findings were the same across all three runs.

**The differences were about how sure the answer sounded.**

- Without the skill, every run said the change breaks the code "in two ways"
  and treated `title` like `price`. Only the `price` failure was shown by a
  test. The `title` claim was reasoning: the field is gone, so `product.title`
  is `undefined`. That reasoning is very likely right here, but the answer did
  not mark it as unproven.
- Without the skill, every run called `title` and `name` a rename, and the
  suggested fix ("read `name` instead of `title`") depends on that guess. The
  two responses do not show that one field replaced the other.
- With the skill, every run gave one label per field (confirmed broken, may be
  affected, no usage found, observed change only), kept `title` and `name` as
  two separate changes, and listed what was not checked.

**The skill is more cautious, not more insightful.** It labelled `title` "may
be affected" even though a reader can see it will render `undefined`. That is
the intended rule (no confirmed break without a failing test), but it means
the plain answer was more direct about a real problem.

## Limits

- Three runs per side, one small demo, one model, one day.
- The "with" prompt was given the test command. The "without" prompt was not;
  those sessions found it in the consumer's README.
- The consumer's own comments and README say what it reads and that the title
  is untested. That helped both sides.
- The demo was built to produce these four outcomes. A real codebase is
  larger and messier; that is not tested here.
- Blocking the edit tools means "changed no files" was partly enforced. No run
  attempted an edit (no denied tool calls in any transcript).
- The runs were scored by Claude in the session that wrote the skill. The
  saved answers in [`runs/`](runs/) let anyone check the table.
- One extra "without" run was made first to check the setup. It is not
  counted. It gave the same findings as the three counted runs.
