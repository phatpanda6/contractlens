# Development setup

Part of the [ContractLens README](../README.md).

## Development

Install dependencies:

```bash
npm install
```

Create the PostgreSQL database used by the application and copy the safe
configuration template:

```bash
createdb contractlens
cp .env.example .env
```

Replace `YOUR_POSTGRES_USER` in `.env` with your local PostgreSQL user. The
private `.env` file is ignored by Git; `.env.example` documents the required
variables without containing real credentials.

For local AI explanation requests, set `AI_GATEWAY_API_KEY` in your private
`.env` file. Leave it blank if you are only using deterministic checks. Keep
the key on the server; it is never needed in browser code. The explanation API
is enabled only when `NODE_ENV` is `development` and `HOSTED_DEMO_MODE` is
`"false"`. A missing key or failed model call leaves the saved check intact and
returns a retryable explanation error. To try it locally, capture the v1
baseline, run v2 to save a FAIL result, then click **Explain this result** below
the detected changes. The card shows the possible frontend impact and what to
check next. Reload the page to confirm the explanation was saved.

Leave `HOSTED_DEMO_MODE="false"` for local or self-hosted use. In this mode,
ContractLens can check supported public HTTPS endpoints after applying its
existing URL-safety rules. Set it to `"true"` only for the public hosted demo,
where requests are restricted to `/api/demo/products/v1` and
`/api/demo/products/v2`.

Apply the existing migrations and seed the Demo Project:

```bash
npx prisma migrate deploy
npm run db:seed
```

Run the development server:

```bash
npm run dev
```

Install the Chromium browser used by Playwright:

```bash
npx playwright install chromium
```

Create the isolated local database used by Playwright:

```bash
createdb contractlens_e2e
cp .env.e2e.example .env.e2e
```

Replace `YOUR_POSTGRES_USER` in `.env.e2e` with your local PostgreSQL user.
Playwright refuses to start unless `DATABASE_URL` points to a database named
`contractlens_e2e`.

Run tests:

```bash
npm test
```

Run browser end-to-end tests:

```bash
npm run test:e2e
```

This command resets `contractlens_e2e`, applies all migrations, seeds the demo
data, and starts its own application server at `127.0.0.1:3100`. Stop any
development server running from this checkout before starting the E2E suite.

Run tests in watch mode:

```bash
npm run test:watch
```

Run lint:

```bash
npm run lint
```

Compare two saved responses:

```bash
npm run compare -- examples/products-consumer/fixtures/product-v1.json examples/products-consumer/fixtures/product-v2.json
```

Run the example consumer's test against the v2 response. This is expected to
fail, because v2 sends `price` as a string:

```bash
PRODUCT_FIXTURE=examples/products-consumer/fixtures/product-v2.json npx vitest run examples/products-consumer
```

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Vitest
- Playwright
- ESLint
- Prisma and PostgreSQL schema
- Vercel AI SDK for the local-only explanation backend
- GitHub Actions
- tsx for the local compare command
- A Claude Code skill for the investigation workflow
