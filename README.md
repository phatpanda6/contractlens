# ContractLens

ContractLens is a lightweight developer tool for detecting breaking API response-shape changes.

The goal is simple: capture the current shape of an API response as a baseline contract, then compare future responses against that baseline. ContractLens uses deterministic TypeScript logic to detect what changed, and later AI will explain the frontend impact in plain English.

> Deterministic code detects the API changes. AI explains the impact.

## Current Status

This project is currently in Phase 1: the core schema engine.

Implemented so far:

- `inferSchema()` converts real JSON-like values into simplified schema shapes.
- `compareSchemas()` compares baseline and latest schemas.
- `formatDiff()` turns structured diffs into readable messages.
- Vitest unit tests cover the implemented core engine behavior.

Not implemented yet:

- Web dashboard
- Demo API routes
- Database persistence
- Live endpoint checks
- AI explanations
- CLI

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

Individual unit tests verify each function in isolation. The next test milestone is an integration-style test that verifies the full engine flow from real response data to formatted diff messages.

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

- Array schemas are currently inferred from the first item only.
- Heterogeneous arrays are not currently represented.
- Nested object comparison is not fully implemented yet.
- Non-2xx responses and invalid JSON handling will be added when live endpoint checks are implemented.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Vitest
- ESLint

Planned later:

- Prisma
- PostgreSQL
- Vercel deployment
- Vercel AI SDK or another structured AI integration

## Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Run tests:

```bash
npm test
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

1. Finish the core schema engine.
2. Add integration tests for the full engine flow.
3. Build a simple UI using fake data.
4. Add demo API routes for predictable contract drift.
5. Add database persistence for projects, endpoints, and test runs.
6. Add a run-test backend route.
7. Connect the UI to the backend.
8. Add AI explanations for failed contract checks.
9. Add CI and deployment.
10. Consider a CLI after the web MVP is working.
