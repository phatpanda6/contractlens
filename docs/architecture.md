# Architecture and design notes

Part of the [ContractLens README](../README.md).

## Architecture Notes

### Core engine

The core engine is intentionally pure TypeScript. It does not depend on React, Next.js, Prisma, a database, or AI.

This separation keeps the most important business logic:

- easier to test
- easier to reason about
- reusable by the web app, API routes, and the compare command
- independent from presentation and persistence concerns

The pipeline is:

```text
real API response
  -> inferSchema()
  -> JsonSchemaShape
  -> compareSchemas()
  -> SchemaDiff[]
  -> formatDiff()
  -> readable messages
```

Unit tests verify each function in isolation, and an integration test verifies the full engine flow from real response data to formatted diff messages.

### Run-check request flow

When a user runs an endpoint check, the request passes through the browser,
server, core engine, and database before the updated result is rendered.

```text
Browser
  -> User clicks Run check and the client sends a POST request
  -> Next.js route loads the endpoint configuration through Prisma
  -> Route validates and safely fetches the configured API
  -> Core engine infers the schema and compares it when a baseline exists
  -> Prisma saves the TestRun in PostgreSQL
  -> Route writes a structured log and returns a response
  -> Client validates and renders the persisted result returned by the API
  -> Dashboard updates status, differences, and history together
  -> Reloading reads the saved state from PostgreSQL again
```

### Baseline-acceptance request flow

Baseline changes are explicit. ContractLens does not automatically replace the
expected contract when a check fails.

```text
Browser sends the reviewed TestRun ID
  -> Baseline route verifies the run belongs to the endpoint
  -> Route copies the stored response and detected schema to the endpoint
  -> Previous TestRun records remain unchanged
  -> Client displays the saved baseline returned by the API
  -> A new check compares against the accepted baseline
```

## Engineering Trade-offs

ContractLens intentionally keeps the MVP narrow. These decisions balance
security, predictable behaviour, and implementation complexity.

| Decision | Benefit | Cost |
| --- | --- | --- |
| Simplified schema model | Inspecting the first array item keeps schema inference understandable, testable, and predictable for homogeneous collections. | Differences in later items are not represented, so heterogeneous arrays can produce false passes. |
| Deterministic PASS/FAIL | The same schemas always produce reproducible results that are straightforward to test, debug, and trust across environments. | The engine cannot interpret business context or make flexible, case-by-case judgements without an explicit rule. |
| Restricted endpoint fetching | Public HTTPS validation, redirect checks, a five-second timeout, a 1 MiB limit, and JSON-only responses reduce SSRF risk and limit server resource use. | Legitimate APIs may be excluded when they are private, slow, larger than 1 MiB, or return a non-JSON response. |
| Seeded shared demo | Visitors can try the complete workflow immediately without creating an account or configuring a project. | State is shared between visitors, history is not private, and another visitor can change the endpoint currently shown by the demo. |

A reset action, temporary per-session data, or authenticated project ownership
could provide stronger isolation later, but those features are outside the
current MVP.

## Test Strategy

ContractLens uses several test layers because no single test can cover every
part of the system.

| Layer | Tool or environment | What it checks |
| --- | --- | --- |
| Unit tests | Vitest | Exercises the pure schema engine and HTTP safety helpers with focused inputs and expected outputs. |
| Route tests | Vitest with mocked Prisma and fetch | Verifies the run route's control flow, persisted statuses, errors, diffs, and structured logs without using a real database or network request. |
| Browser E2E | Playwright with PostgreSQL | Runs the v1 PASS, v2 FAIL, explicit baseline acceptance, and v2 PASS workflow through Chromium against an isolated PostgreSQL database locally and in CI. |
| Continuous integration | GitHub Actions | Runs Vitest, ESLint, the production build, and Playwright on clean machines for pushes and pull requests. |
| Production verification | Vercel runtime and logs | Manually confirms that the deployed application loads, reaches the production database, and produces no new connection warnings. |

## AI Design Principle

AI does not decide whether a contract passes or fails.

The deterministic schema engine detects missing fields, new fields, and type
changes. The local-only explanation API uses the AI SDK through Vercel AI Gateway
to explain a saved FAIL run's already-detected diffs in plain English. The
dashboard shows the explanation beside the detected changes and reads it again
after reload. The hosted demo does not allow live AI generation.

This keeps correctness in code and uses AI for communication.

The explanation in the web app describes possible impact. It is not a confirmed
failure: a schema-level breaking change does not prove that a particular
frontend fails. "Confirmed broken" appears only in the investigation skill's
report, and only when a test passes with the old response and fails with the
new one.

## How This Differs From Postman

Postman is a full API platform for designing, testing, documenting, monitoring, and governing APIs.

ContractLens is not trying to replace Postman. It is intentionally narrower: a lightweight response-shape drift detector for frontend and full-stack developers who want a quick sanity check without manually writing schemas or setting up a full API testing workflow.

The key product difference is automatic baseline capture from a live response. ContractLens focuses on:

- response-shape drift
- frontend-breaking changes
- deterministic TypeScript comparison logic
- readable impact explanations
- optional local AI explanations built on top of detected diffs

## Current Status

ContractLens has a working database-backed demo. The seeded endpoint can use a
live response as its baseline, run the same contract against a later response,
and keep the result in PostgreSQL so it is still visible after a page reload.

What works today:

- `inferSchema()` converts JSON values into a small schema representation.
- `compareSchemas()` handles nested objects, array item schemas, null changes,
  and object/array/primitive type changes.
- Missing fields and type changes are marked as breaking. New fields are kept as
  informational changes.
- The endpoint run route saves baselines, PASS/FAIL results, response schemas,
  readable diffs, and useful error records.
- Local and self-hosted installations can check validated public HTTPS URLs.
  Private and loopback targets are blocked, redirects are checked again, and
  requests have a timeout and response-size limit. The public hosted demo is
  restricted to its two built-in demo routes.
- The homepage reads the demo project, endpoint configuration, latest result,
  response data, and five most recent checks from PostgreSQL. Database access
  stays in the server page; the interactive dashboard receives that saved data.
- Save, run, and acceptance controls coordinate their pending state until the
  saved API result is displayed. Unsaved edits block running a check, and a result from a
  different target cannot be accepted through the dashboard.
- A reviewed PASS or FAIL result can be explicitly accepted as the new baseline
  without rewriting the status of earlier checks.
- GitHub Actions runs Vitest, ESLint, the production build, and Playwright on
  pushes and pull requests.
- Playwright uses an isolated PostgreSQL service in CI and covers the persisted
  v1 PASS -> v2 FAIL -> accept v2 -> v2 PASS journey through Chromium.
- Every persisted endpoint run emits a structured summary containing its run ID,
  endpoint ID, status, duration, and diff count.
- A local-development-only explanation API can generate and save an explanation
  for a stored FAIL run. It reads the saved diffs, sends only selected diff fields
  through Vercel AI Gateway, and leaves the saved PASS/FAIL status unchanged.
  The dashboard offers **Explain this result** for an unexplained FAIL run and
  displays the saved explanation beside the detected changes, including after
  a reload. The route and model helper have mocked tests, and the local v1 to
  v2 flow has been exercised with a live Gateway call.
- `compareResponses()` wraps the engine and returns a verdict, counts and
  diffs. `npm run compare` runs it on two saved JSON files with exit codes
  `0`, `1` and `2`.
- `examples/products-consumer` is a small example consumer with v1 and v2
  fixtures and one focused test that can run against either response.
- The `api-change-investigation` Claude Code skill runs the compare command,
  searches a consumer folder, optionally runs a test against both responses,
  and labels each changed field with its evidence.
- `docs/skill-comparison` records the same example investigated with and
  without the skill, three runs each.
