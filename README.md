# ContractLens

ContractLens is a lightweight developer tool for detecting breaking API response-shape changes.

The goal is simple: capture the current shape of an API response as a baseline contract, then compare future responses against that baseline. ContractLens uses deterministic TypeScript logic to detect what changed, and later AI will explain the frontend impact in plain English.

> Deterministic code detects the API changes. AI explains the impact.

## Why ContractLens?

Frontend developers often depend on API responses they do not fully control. A small backend response change, such as removing a field or changing a number into a string, can silently break UI rendering, sorting, formatting, or calculations.

ContractLens focuses on one narrow problem: detecting response-shape drift quickly from real API responses.

The MVP is intentionally lightweight:

- provide an endpoint
- capture the current response shape as a baseline
- run the endpoint again later
- detect missing fields, new fields, and type changes
- explain what changed in readable language

## How This Differs From Postman

Postman is a full API platform for designing, testing, documenting, monitoring, and governing APIs.

ContractLens is not trying to replace Postman. It is intentionally narrower: a lightweight response-shape drift detector for frontend and full-stack developers who want a quick sanity check without manually writing schemas or setting up a full API testing workflow.

The key product difference is automatic baseline capture from a live response. ContractLens focuses on:

- response-shape drift
- frontend-breaking changes
- deterministic TypeScript comparison logic
- readable impact explanations
- future AI explanations built on top of detected diffs

## Live Demo

[Open the deployed ContractLens demo](https://contractlens-iota.vercel.app/)

To try the breaking-change workflow:

1. Enter `/api/demo/products/v1` in **Endpoint URL**, then click **Save endpoint** and **Run check**.
2. Confirm that the status is `Pass` and **Changes Found** is `0`.
3. Change **Endpoint URL** to `/api/demo/products/v2`, then click **Save endpoint** and **Run check** again.
4. Confirm that the status is `Fail` and **Changes Found** is `3`. The detected changes should include:

   - `price` changed from number to string
   - `title` is missing
   - `name` was added

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
- External endpoint requests are limited to validated public HTTPS URLs. Private
  and loopback targets are blocked, redirects are checked again, and requests
  have a timeout and response-size limit.
- The homepage reads the demo project, endpoint configuration, latest result,
  response data, and five most recent checks from PostgreSQL.
- GitHub Actions runs Vitest, ESLint, the production build, and Playwright on
  pushes and pull requests.
- Playwright uses an isolated PostgreSQL service in CI and covers the persisted
  v1 baseline -> v2 FAIL journey through Chromium.
- Every persisted endpoint run emits a structured summary containing its run ID,
  endpoint ID, status, duration, and diff count.

Still to do:

- Polish the main demo's error, empty, loading, and accessibility states.
- Add a CLI after the web workflow is settled.
- Add AI explanations without giving AI control over PASS/FAIL.

## Core Engine

The core engine lives in `lib/contractlens`.

```text
lib/contractlens/
  types.ts
  infer-schema.ts
  compare-schemas.ts
  format-diff.ts
  __tests__/
```

### `inferSchema()`

`inferSchema()` takes real API response data and returns a simplified schema shape.

Example:

```ts
inferSchema({
  id: "p_123",
  title: "Nike Hoodie",
  price: 89.99,
});
```

Returns:

```ts
{
  id: "string",
  title: "string",
  price: "number",
}
```

### `compareSchemas()`

`compareSchemas()` compares an expected baseline schema against a latest actual schema.

Example:

```ts
compareSchemas(
  { id: "string", title: "string", price: "number" },
  { id: "string", name: "string", price: "string" },
);
```

Returns:

```ts
[
  { type: "MISSING_FIELD", path: "title", severity: "breaking" },
  {
    type: "TYPE_CHANGED",
    path: "price",
    severity: "breaking",
    from: "number",
    to: "string",
  },
  { type: "NEW_FIELD", path: "name", severity: "info" },
]
```

### `formatDiff()`

`formatDiff()` turns structured diffs into readable messages.

Example:

```ts
formatDiff([
  { type: "MISSING_FIELD", path: "title", severity: "breaking" },
]);
```

Returns:

```ts
["`title` is missing"]
```

## Architecture Notes

### Core engine

The core engine is intentionally pure TypeScript. It does not depend on React, Next.js, Prisma, a database, or AI.

This separation keeps the most important business logic:

- easier to test
- easier to reason about
- reusable by the future web app, API routes, and CLI
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
  -> Client calls router.refresh()
  -> Server Component reads the persisted result from PostgreSQL
  -> Dashboard renders the status, differences, and history
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
| Browser E2E | Playwright with PostgreSQL | Runs the saved v1-to-v2 workflow through Chromium against the Next.js application and an isolated PostgreSQL database in CI. |
| Continuous integration | GitHub Actions | Runs Vitest, ESLint, the production build, and Playwright on clean machines for pushes and pull requests. |
| Production verification | Vercel runtime and logs | Manually confirms that the deployed application loads, reaches the production database, and produces no new connection warnings. |

## Change Classification

Breaking changes:

- Removed field
- Type changed

Informational changes:

- New field added

The product treats new fields as informational because existing frontend code can usually ignore extra response fields.

## AI Design Principle

AI will not decide whether a contract passes or fails.

The deterministic schema engine is responsible for detecting missing fields, new fields, and type changes. AI will be added later only to explain already-detected diffs in plain English.

This keeps correctness in code and uses AI for communication.

## Known Limitations

- Array schemas use the first item as their representative shape. Empty arrays
  have no known item shape, and heterogeneous arrays are not fully represented.
- The current UI is centred on the seeded Demo Project and its first endpoint;
  project creation and endpoint selection are not part of this demo yet.
- The dashboard shows the five most recent checks rather than an unbounded
  history.
- Endpoint checks require JSON responses and use a five-second timeout and a
  1 MiB response limit.
- Production observability currently consists of structured per-run summaries;
  metrics and alerting are not implemented.
- AI explanations and the CLI have not been implemented.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Vitest
- Playwright
- ESLint
- Prisma and PostgreSQL schema
- GitHub Actions

Planned later:

- Vercel AI SDK or another structured AI integration
- A small CLI

## Development

Install dependencies:

```bash
npm install
```

Install the Chromium browser used by Playwright:

```bash
npx playwright install chromium
```

Run the development server:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Run browser end-to-end tests:

```bash
npm run test:e2e
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run lint:

```bash
npm run lint
```

## Roadmap

1. Polish the main demo's error, empty, loading, and accessibility states.
2. Consider a minimal CLI with readable diffs and exit code `1` for breaking
   changes.
3. Add AI explanations only after the deterministic result is already known.
