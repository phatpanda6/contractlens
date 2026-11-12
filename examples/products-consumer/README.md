# Example products consumer

A small example of code that depends on an API response. It exists to
demonstrate ContractLens; it is not part of the web app.

- `format-product.ts` reads `title` and calls `price.toFixed(2)`.
- `fixtures/product-v1.json` and `fixtures/product-v2.json` are saved example
  responses. This is a fixture-based demo, not live monitoring.
- `format-product.test.ts` runs against v1 by default.

Run the same test against v2 to see the break:

```bash
PRODUCT_FIXTURE=examples/products-consumer/fixtures/product-v2.json npx vitest run examples/products-consumer
```

Compare the two responses:

```bash
npm run compare -- examples/products-consumer/fixtures/product-v1.json examples/products-consumer/fixtures/product-v2.json
```
