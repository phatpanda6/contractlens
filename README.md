# ContractLens

ContractLens helps you find out whether an API response change breaks the code that uses it.

It has two parts:

- A tested, deterministic checker that compares two JSON responses and reports what changed and whether each change is breaking.
- A Claude Code skill that runs the checker, searches the code that uses the response, and reports what is proven to break and what only might.

A web app shows the same checker with saved history.

> Deterministic code detects the change. AI investigates possible impact and shows its evidence.

## Investigate an API change in Claude Code

The skill lives in `.claude/skills/api-change-investigation/`. Open this repository in Claude Code and give it:

1. the old response file (the baseline);
2. the new response file;
3. the folder of code that uses the response; and
4. optionally, a test command with `{response}` where the response file path goes.

To try it on the included example, run `npm install`, then paste this prompt:

```text
Use the api-change-investigation skill. Baseline: examples/products-consumer/fixtures/product-v1.json. Latest: examples/products-consumer/fixtures/product-v2.json. Consumer folder: examples/products-consumer. Test command: PRODUCT_FIXTURE={response} npx vitest run examples/products-consumer
```

The report for that example:

| Field | Change | Schema verdict | Finding | Evidence |
| --- | --- | --- | --- | --- |
| `price` | number -> string | breaking | Confirmed broken | the test fails with only this field changed: `product.price.toFixed is not a function` at `format-product.ts:12` |
| `title` | removed | breaking | Test still passes | read at `format-product.ts:12`; the test passes with only this change, but it checks only the price |
| `inStock` | boolean -> string | breaking | No usage found | no reads in `examples/products-consumer`; the test passes with only this change |
| `name` | added | info | Observed change only | none needed |

The checker calls three of these changes breaking. Only one is proven to break this consumer. Each changed field gets exactly one label:

- **Confirmed broken:** a test passes with the old response and fails when only this field is changed. The test output is quoted.
- **Test still passes:** code reads the field, and the test passes when only this field is changed. This proves only what that test checks.
- **May be affected:** code reads the field, with file and line, but there is no test result for it.
- **No usage found:** the change is breaking by the schema rule, but no code in the folder reads the field.
- **Observed change only:** an informational change, such as a new field.

The skill is read-only. It never edits files in the repository, writes a test, changes a baseline, treats a removed field and a new field as a rename, or reports a test result it did not run. Without a test command it never says "confirmed broken" or "test still passes".

To test one field at a time, the skill uses `npm run isolate`, which writes one response file per change: the old response with only that change applied. A test that stops at its first failure can then still show a second break behind it.

This example uses saved response files. It is not live monitoring. The skill has been run on this example and on one real codebase, described below.

## Compare two responses from the terminal

The checker also runs on its own. It needs no web app, database or model key.

```bash
npm run compare -- examples/products-consumer/fixtures/product-v1.json examples/products-consumer/fixtures/product-v2.json
```

```text
Breaking changes detected
3 breaking, 1 info
  [breaking] `title` is missing
  [breaking] `price` changed from number to string
  [breaking] `inStock` changed from boolean to string
  [info] `name` was added
```

Add `--json` for machine-readable output. Exit codes:

| Code | Meaning |
| --- | --- |
| `0` | no breaking changes, including identical responses |
| `1` | breaking changes |
| `2` | invalid input: a missing file, invalid JSON, or wrong arguments |

## With and without the skill

Claude can investigate this change without the skill, so the same example was run in fresh Claude Code sessions both ways, three times each. Without the skill, Claude already ran the test against both responses, cited file and line, and gave consistent answers. The difference in these runs was that the skill separated proven breaks from possible ones, did not describe `title` and `name` as a rename, and used the same report layout every time.

The same comparison was then run on real code, this project's own web app, with a made-up change to a real response. There, plain Claude gave the more useful answer: it read the validation code and correctly said which changes break it, while the skill's rules left a real break and a harmless change under the same "may be affected" label.

The skill was then changed to test each changed field on its own. Re-run on the same trial, it matched the answer key in 3 of 3 runs, with a test run behind each verdict. Plain Claude had reached the same conclusions by reading the code, so the change adds proof, not a different answer. It was also measured on the trial it was designed from, which is a check that the fix works, not an independent test.

Both are small samples, three runs per side, and neither is evidence about the skill in general. The methods, prompts, results and limits are in [docs/skill-comparison](docs/skill-comparison/README.md) and [docs/real-codebase-trial](docs/real-codebase-trial/README.md).

## Live Demo

[Open the deployed ContractLens demo](https://contractlens-iota.vercel.app/)

The web app is the hosted demo and a place to inspect saved check history. It runs the same checker against two built-in demo routes. Live AI explanations are available only in local development.

To see a breaking change:

1. Choose **Original response v1** and click **Run check**. The result should be `Pass` with `0 changes found`. If the shared demo currently uses a different baseline, click **Accept as new baseline** and run v1 again.
2. Choose **Changed response v2** and click **Run check**. The result should be `Fail` with `3 changes found`: `price` changed from number to string, `title` is missing, and `name` was added.
3. Click **Accept as new baseline** after reviewing the changes.
4. Click **Run check** again. The new check passes with `0` changes, and the earlier failed check stays in the history.

The full walkthrough and a description of the comparison screen are in [docs/web-app.md](docs/web-app.md).

## Video Walkthrough

[Watch the web app walkthrough](https://www.loom.com/share/789d89b95aa64d328a32f2c0d16136d5)

The recording demonstrates local development: comparing the built-in responses,
generating an AI explanation, reloading saved results, and accepting a new
baseline. Live AI generation is disabled in the public hosted demo.

A recording of the skill workflow is not linked yet.

## Why ContractLens?

Frontend developers often depend on API responses they do not fully control. A small backend response change, such as removing a field or changing a number into a string, can silently break UI rendering, sorting, formatting, or calculations.

ContractLens focuses on one narrow problem: detecting response-shape drift quickly from real API responses.

It matters most to people who consume an API owned by another team or company. They often never see the provider's diff, and may not know which of their own code depends on a changed field.

The MVP is intentionally lightweight:

- provide an endpoint
- capture the current response shape as a baseline
- run the endpoint again later
- detect missing fields, new fields, and type changes
- explain what changed in readable language

ContractLens is not trying to replace Postman or other API platforms. It is intentionally narrower: a quick response-shape check that needs no hand-written schema.

## How it works

The checker is pure TypeScript. It does not depend on React, Next.js, a database or AI.

```text
real API response
  -> inferSchema()
  -> JsonSchemaShape
  -> compareSchemas()
  -> SchemaDiff[]
  -> formatDiff()
  -> readable messages
```

Deterministic code decides what changed and whether a change is breaking. AI never decides pass or fail. In the web app it explains possible impact; in the skill it searches the consuming code and reports its evidence.

- [docs/engine.md](docs/engine.md): the engine functions, with examples, and how changes are classified.
- [docs/architecture.md](docs/architecture.md): request flows, trade-offs, test strategy and the AI design principle.

## Known Limitations

- Array schemas use the first item as their representative shape. Empty arrays
  have no known item shape, and heterogeneous arrays are not fully represented.
- The current UI is centred on the seeded Demo Project and its first endpoint;
  project creation and endpoint selection are not part of this demo yet.
- The public hosted demo accepts only `/api/demo/products/v1` and
  `/api/demo/products/v2`. Local and self-hosted installations can use validated
  public HTTPS endpoints.
- Visitors to the public demo share its endpoint configuration, baseline, and
  check history, so another visitor can change what is currently displayed.
- The dashboard shows the five most recent checks rather than an unbounded
  history.
- Endpoint checks require JSON responses and use a five-second timeout and a
  1 MiB response limit.
- Production observability currently consists of structured per-run summaries;
  metrics and alerting are not implemented.
- Live AI explanations require local development and a configured Gateway key;
  the public hosted demo does not offer the Explain action.
- The compare command reads saved JSON files. It does not fetch URLs.
- The investigation skill has been run only on the included example consumer
  and on this project's own web app. It searches only the folder it is given,
  and it can confirm a break only when it is given a test command.
- The skill's per-field results are only as good as the test it is given.
  "Test still passes" means that one test passed, not that the change is safe.
- The per-field step was designed from the web app trial and re-measured on
  that same trial, not on new code. Changes inside arrays cannot be tested
  one at a time yet. See
  [docs/real-codebase-trial](docs/real-codebase-trial/README.md).

## Getting started

The compare command, the example consumer and the skill need only Node.js and the dependencies:

```bash
npm install
```

```bash
npm run compare -- examples/products-consumer/fixtures/product-v1.json examples/products-consumer/fixtures/product-v2.json
```

```bash
npm test
```

The web app also needs PostgreSQL. Database setup, environment variables, migrations and the browser tests are in [docs/development.md](docs/development.md).

## Status and next steps

Working today:

- The schema engine, the compare command and the example consumer, covered by unit tests.
- The investigation skill, run on the example consumer and on this project's own web app.
- The database-backed web app: capture a baseline, run a check, review the changes, accept a new baseline, and keep the history.
- GitHub Actions runs the unit tests, lint, the production build and the browser tests on every push and pull request.

The detailed list is in [docs/architecture.md](docs/architecture.md#current-status).

Next:

- Complete a targeted keyboard, visible-focus, screen-reader announcement,
  narrow-viewport, long-JSON, and slow/failing-operation audit.
- Record the skill workflow and link it here.
- Try the improved skill on a codebase and change it was not designed from.

## How this was built

- I wrote the schema engine and the web app myself, using an AI assistant as a mentor for explanations and review.
- The compare command, the example consumer, the investigation skill, the comparison and this documentation were implemented with Claude Code. Those commits are co-authored by Claude.
- For that work I made the design decisions and approved each plan before it was built: the four report labels, which demo field goes unused, leaving `title` untested, the rule that only a failing test confirms a break, and publishing the comparison as it came out.

## More documentation

- [docs/engine.md](docs/engine.md): engine functions and change classification
- [docs/architecture.md](docs/architecture.md): architecture, trade-offs, test strategy and detailed status
- [docs/web-app.md](docs/web-app.md): the full web app demo walkthrough
- [docs/development.md](docs/development.md): full local setup and tech stack
- [docs/skill-comparison](docs/skill-comparison/README.md): the skill compared with plain Claude on the example
- [docs/real-codebase-trial](docs/real-codebase-trial/README.md): the same comparison on this project's web app
