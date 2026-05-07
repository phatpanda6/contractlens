# ContractLens Project Brief

## Project Summary

ContractLens is a lightweight developer tool that helps frontend/full-stack developers detect breaking API response changes.

The tool lets a developer capture the current shape of an API response as a baseline contract, then run future checks against that same endpoint. If the response shape changes, ContractLens shows what changed, whether it is likely breaking, and later uses AI to explain the frontend impact in plain English.

The core principle is:

> Deterministic code detects the API changes. AI explains the impact.

This project is a capstone portfolio project. The goal is to demonstrate full-stack engineering, TypeScript, API design, testing, developer tooling, and AI integration without over-scoping.

---

## Target User

The target user is a frontend or full-stack developer who depends on backend APIs.

Example problem:

A frontend component expects this API response:

{
"id": "123",
"title": "Nike Hoodie",
"price": 89.99
}

Later the backend changes the response to:

{
"id": "123",
"name": "Nike Hoodie",
"price": "89.99"
}

The frontend may break because:

* `title` was removed
* `name` was added
* `price` changed from number to string

ContractLens should detect this automatically.

---

## MVP Goal

The MVP should allow a developer to:

1. Add or define an API endpoint.
2. Capture the first response as the baseline contract.
3. Run the endpoint again later.
4. Infer the new response schema.
5. Compare the new schema against the saved baseline.
6. Show missing fields, new fields, and type changes.
7. Classify changes as breaking or non-breaking.
8. Display the results in a simple, readable way.
9. Later, generate an AI explanation of the breaking changes.

---

## Important Product Direction

Do not make users manually paste or write schemas.

The setup experience should be low-friction.

Good workflow:

* User provides endpoint URL.
* ContractLens calls the endpoint.
* ContractLens auto-generates the baseline schema.
* Later ContractLens checks whether the API response shape changed.

Bad workflow:

* User manually writes JSON schema.
* User manually pastes expected fields.
* User manually updates contracts every time.

The project should feel like a developer tool, not just a dashboard.

---

## Existing Tools / Differentiation

Tools like Pact, Postman contract testing, OpenAPI/Swagger tools, and Stoplight Prism already exist.

ContractLens is not trying to replace them.

Differentiation:

* Lightweight and beginner-friendly.
* Focused on response-shape drift.
* Auto-generates contracts from live endpoints.
* Useful for frontend developers who want a quick sanity check.
* AI explains the frontend impact in plain English.
* Built as a portfolio-friendly developer tool with a dashboard and eventually a CLI.

Interview positioning:

> Pact and Postman are mature enterprise tools. ContractLens is a lightweight tool focused on quick setup: capture a live endpoint, generate a baseline contract, detect breaking response-shape changes, and explain the frontend impact with AI.

---

## Recommended Tech Stack

### Core Logic

Use:

* TypeScript
* Vitest

The core logic should be pure TypeScript with no React, no Next.js, no Prisma, and no AI.

Core functions:

* `inferSchema()`
* `compareSchemas()`
* `classifyDiff()`
* `formatDiff()`

### Web App

Use:

* Next.js
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* Prisma
* PostgreSQL
* Vercel
* Neon or Supabase Postgres

### AI

Use:

* Vercel AI SDK
* OpenAI or Anthropic provider
* Zod structured output if useful

Do not use LangChain for the MVP. The MVP only needs a simple structured AI explanation, not agents or complex orchestration.

### CLI

Eventually use:

* Node.js
* TypeScript
* Commander
* Chalk, optional

The CLI should be added after the core engine works.

---

## Suggested Project Structure

For the simplest start, begin inside a single Next.js app:

src/
lib/
contractlens/
infer-schema.ts
compare-schemas.ts
format-diff.ts
types.ts

Later, if the logic is stable, move it into a monorepo structure:

contractlens/
apps/
web/
Next.js dashboard
packages/
core/
Pure TypeScript schema/diff engine
cli/
Terminal tool

Do not overcomplicate the project at the beginning.

Start simple.

---

## Core Concepts

### 1. API Contract

An API contract is the expected shape of an API response.

Example:

{
"id": "string",
"title": "string",
"price": "number",
"inStock": "boolean"
}

This means the frontend expects:

* `id` to exist and be a string
* `title` to exist and be a string
* `price` to exist and be a number
* `inStock` to exist and be a boolean

---

### 2. Schema Inference

`inferSchema()` takes real JSON data and turns it into a type-shape object.

Input:

{
"id": "123",
"name": "Alan",
"age": 24,
"isPremium": true
}

Output:

{
"id": "string",
"name": "string",
"age": "number",
"isPremium": "boolean"
}

It should care about the shape/types, not the exact values.

---

### 3. Schema Comparison

`compareSchemas()` compares the old expected schema against the new actual schema.

Old schema:

{
"id": "string",
"title": "string",
"price": "number"
}

New schema:

{
"id": "string",
"name": "string",
"price": "string"
}

Expected diff:

* `title` is missing
* `name` was added
* `price` changed from number to string

---

### 4. Breaking vs Non-Breaking Changes

Breaking changes:

* Field removed
* Type changed
* Object changed to array
* Array changed to object
* Required field becomes null
* Endpoint returns non-2xx status
* Response is not valid JSON

Usually non-breaking changes:

* New field added
* Extra nested field added

Reason:

Adding a field usually does not break existing frontend code because the frontend can ignore it.

Removing or changing a field can break frontend code because the frontend may rely on it.

---

### 5. AI Explanation

AI should not decide whether the contract passes or fails.

The app should use deterministic TypeScript logic to detect changes.

AI should only explain:

* What changed
* Why it matters
* How it could affect the frontend
* What a developer should check
* Suggested fixes

Example AI report:

Risk level: High

Summary:
The API response has likely breaking changes. The `title` field was removed and the `price` field changed from number to string.

Frontend impact:

* Components using `product.title` may render blank content.
* Sorting, calculations, discounts, and currency formatting may break if they expect `price` to be numeric.

Suggested fixes:

* Update frontend code to use the new field if the backend change is intentional.
* Ask the backend to keep the old field for backwards compatibility.
* Convert `price` back to a number if numeric calculations are required.

---

## MVP Feature List

### Must Have

* Create a project or use a demo project.
* Add a GET endpoint.
* Capture baseline from a live endpoint.
* Infer schema from JSON response.
* Save baseline schema.
* Run test against same endpoint later.
* Infer latest schema.
* Compare baseline schema vs latest schema.
* Show diff results.
* Mark test as pass/fail.
* Save test history.
* Include demo API routes for easy testing.

### Should Have

* Clean dashboard UI.
* Status badges.
* JSON/schema viewer.
* Diff viewer.
* Basic loading and error states.
* Vitest tests for core functions.
* GitHub Actions CI running tests.

### Nice To Have Later

* AI explanation report.
* CLI tool.
* Config file for CLI.
* Exit code 1 on CLI failure.
* Auth.
* Scheduled checks.
* GitHub integration.
* Slack alerts.
* OpenAPI import.
* Postman import.
* Team collaboration.

---

## Demo API Routes

The project should include demo API routes so recruiters can test the app easily.

Example:

`/api/demo/products/v1`

Returns:

{
"id": "p_123",
"title": "Nike Hoodie",
"price": 89.99,
"inStock": true
}

`/api/demo/products/v2`

Returns:

{
"id": "p_123",
"name": "Nike Hoodie",
"price": "89.99",
"inStock": true
}

Demo flow:

1. Capture `/api/demo/products/v1` as baseline.
2. Change endpoint URL to `/api/demo/products/v2`.
3. Run test.
4. ContractLens detects:

   * `title` missing
   * `name` added
   * `price` changed from number to string

---

## Database Models

Use Prisma with PostgreSQL.

Suggested models:

Project

* id
* name
* createdAt
* endpoints

Endpoint

* id
* projectId
* name
* method
* url
* headers
* baselineSchema
* baselineExample
* createdAt
* testRuns

TestRun

* id
* endpointId
* status
* responseBody
* detectedSchema
* diff
* aiExplanation
* errorMessage
* createdAt

Possible Prisma schema:

model Project {
id        String     @id @default(cuid())
name      String
endpoints Endpoint[]
createdAt DateTime   @default(now())
}

model Endpoint {
id              String    @id @default(cuid())
projectId       String
project         Project   @relation(fields: [projectId], references: [id])
name            String
method          String
url             String
headers         Json?
baselineSchema  Json?
baselineExample Json?
testRuns        TestRun[]
createdAt       DateTime  @default(now())
}

model TestRun {
id              String   @id @default(cuid())
endpointId      String
endpoint        Endpoint @relation(fields: [endpointId], references: [id])
status          String
responseBody    Json?
detectedSchema  Json?
diff            Json?
aiExplanation   String?
errorMessage    String?
createdAt       DateTime @default(now())
}

---

## Important Types

Suggested TypeScript types:

type PrimitiveSchema =
| "string"
| "number"
| "boolean"
| "null"
| "undefined";

type JsonSchemaShape =
| PrimitiveSchema
| { [key: string]: JsonSchemaShape }
| JsonSchemaShape[];

type DiffSeverity = "breaking" | "info";

type DiffType =
| "MISSING_FIELD"
| "NEW_FIELD"
| "TYPE_CHANGED";

type SchemaDiff = {
type: DiffType;
path: string;
severity: DiffSeverity;
from?: string;
to?: string;
};

---

## Core Function Responsibilities

### `inferSchema(value: unknown): JsonSchemaShape`

Purpose:

Turn real JSON into a simplified schema shape.

Example:

Input:

{
"id": "123",
"price": 89.99,
"tags": ["sale", "new"]
}

Output:

{
"id": "string",
"price": "number",
"tags": ["string"]
}

Rules:

* `null` should return `"null"`
* string should return `"string"`
* number should return `"number"`
* boolean should return `"boolean"`
* array should return an array containing the inferred schema of the first item for MVP
* object should recursively infer each property
* empty array can return `[]`

Keep v1 simple.

---

### `compareSchemas(expected, actual): SchemaDiff[]`

Purpose:

Compare baseline schema against latest schema.

Rules:

* If a key exists in expected but not actual, return `MISSING_FIELD`
* If a key exists in actual but not expected, return `NEW_FIELD`
* If both exist but types differ, return `TYPE_CHANGED`
* Recursively compare nested objects
* Include dot-paths like `user.profile.name`

Example output:

[
{
"type": "MISSING_FIELD",
"path": "title",
"severity": "breaking"
},
{
"type": "NEW_FIELD",
"path": "name",
"severity": "info"
},
{
"type": "TYPE_CHANGED",
"path": "price",
"from": "number",
"to": "string",
"severity": "breaking"
}
]

---

### `formatDiff(diff): string[]`

Purpose:

Turn diff objects into readable messages.

Example:

Input:

[
{
"type": "MISSING_FIELD",
"path": "title",
"severity": "breaking"
}
]

Output:

[
"`title` is missing"
]

---

## Route Handler: Run Test

Suggested route:

POST /api/endpoints/[endpointId]/run

Responsibilities:

1. Find endpoint in database.
2. Fetch the endpoint URL.
3. Parse response as JSON.
4. Infer schema from response.
5. If endpoint has no baseline:

   * save detected schema as baseline
   * save response as baseline example
   * create test run with status `BASELINE_CREATED`
6. If endpoint has a baseline:

   * compare baseline schema against detected schema
   * if there are breaking changes, status is `FAIL`
   * otherwise status is `PASS`
   * save response, detected schema, diff, and status to TestRun
7. Return result to frontend.

Pseudo-code:

const endpoint = await prisma.endpoint.findUnique(...);

const response = await fetch(endpoint.url, {
method: endpoint.method,
headers: endpoint.headers,
});

if (!response.ok) {
save TestRun with status ERROR;
}

const json = await response.json();
const detectedSchema = inferSchema(json);

if (!endpoint.baselineSchema) {
save detectedSchema as baselineSchema;
save json as baselineExample;
create TestRun with status BASELINE_CREATED;
return result;
}

const diff = compareSchemas(endpoint.baselineSchema, detectedSchema);
const hasBreakingChanges = diff.some(item => item.severity === "breaking");

create TestRun with status hasBreakingChanges ? "FAIL" : "PASS";

return result;

---

## Suggested Pages

### `/`

Landing page or redirect to dashboard.

### `/projects`

Show project cards.

### `/projects/[projectId]`

Show list of endpoints for a project.

Each endpoint card should show:

* name
* method
* URL
* last status
* last checked time

### `/endpoints/[endpointId]`

Show endpoint details:

* method
* URL
* baseline schema
* latest test result
* run test button
* test history
* diff results
* AI explanation if available

---

## Build Order

### Phase 1: Core logic only

Build:

* `inferSchema()`
* `compareSchemas()`
* `formatDiff()`
* Vitest tests

Do this before database, UI, or AI.

Goal:

Prove the engine works.

---

### Phase 2: Simple UI with fake data

Build:

* dashboard shell
* endpoint detail page
* sample baseline schema
* sample latest schema
* display diff result

Use fake hardcoded data first.

Goal:

See the product visually without database complexity.

---

### Phase 3: Add demo API routes

Build:

* `/api/demo/products/v1`
* `/api/demo/products/v2`

Goal:

Have predictable APIs that intentionally change shape.

---

### Phase 4: Add Prisma and database

Build:

* Project model
* Endpoint model
* TestRun model

Goal:

Save endpoints, baselines, and test history.

---

### Phase 5: Add Run Test backend route

Build:

* `POST /api/endpoints/[endpointId]/run`

Goal:

Real endpoint testing works.

---

### Phase 6: Connect UI to backend

Build:

* Add endpoint form
* Capture baseline button
* Run test button
* Show latest result
* Show test history

Goal:

MVP dashboard is usable.

---

### Phase 7: Add AI report

Build:

* Vercel AI SDK integration
* AI explanation for failed test runs
* Save AI explanation to TestRun
* Show AI explanation card in UI

Goal:

Add the headline AI feature.

---

### Phase 8: Add tests and CI

Build:

* Vitest tests for core logic
* GitHub Actions workflow

Goal:

Show testing and CI/CD thinking.

---

### Phase 9: Optional CLI

Build later:

* `contractlens capture <url>`
* `contractlens test`
* local `.contractlens` folder
* local contract JSON file
* terminal pass/fail output
* exit code 1 on breaking changes

Goal:

Improve developer workflow and make the project stand out.

---

## MVP Scope Boundaries

Avoid for MVP:

* Auth
* Teams
* Billing
* Slack integration
* GitHub OAuth
* GitHub PR comments
* Scheduled checks
* OpenAPI import
* Postman import
* GraphQL support
* Manual schema editor
* Advanced CLI publishing
* Complex monorepo setup too early

Focus on a polished small product.

---

## Coding Agent Instructions

When assisting with this project, please act as a mentor and reviewer, not as someone who builds the whole project for me.

Important rules:

1. Prefer explanations, hints, and small targeted suggestions.
2. Do not rewrite large parts of the codebase unless explicitly asked.
3. Before implementing a feature, explain the plan in beginner-friendly language.
4. When suggesting code, explain why each part exists.
5. Keep the MVP scope small.
6. Prioritise TypeScript correctness and readability.
7. Help me understand tradeoffs.
8. Ask before making broad refactors.
9. Focus heavily on the core logic first.
10. Do not add LangChain, auth, teams, billing, Slack, GitHub integrations, or scheduled jobs unless explicitly requested.
11. The project should remain understandable for a self-taught junior developer.
12. I want to build most of this myself, so give me guidance rather than complete solutions when possible.

---

## Current Priority

The first priority is to build and test the core schema engine.

Start with:

1. `inferSchema()`
2. `compareSchemas()`
3. `formatDiff()`
4. Vitest tests

Do not start with AI, Prisma, auth, CLI, or deployment.

The first useful milestone is:

> Given two JSON objects, ContractLens can infer their schemas, compare them, and show readable breaking changes.

Example milestone:

Input 1:

{
"id": "p_123",
"title": "Nike Hoodie",
"price": 89.99
}

Input 2:

{
"id": "p_123",
"name": "Nike Hoodie",
"price": "89.99"
}

Expected result:

* `title` is missing
* `name` was added
* `price` changed from number to string

This is the core of the entire project.
