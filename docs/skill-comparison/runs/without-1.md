# Run without-1 (without the skill)

Model: claude-opus-5-5. Turns: 5. Files changed: none.

## Tool calls

```
Bash: cd examples/products-consumer && find . -type f -not -path '*/node_modules/*' | head -50 && echo ---- && cat fixtures/product-v1.json && echo ---- && cat fixtures/product-v2.json
```

```
Bash: cat format-product.ts; echo ----; cat format-product.test.ts; echo ----; cat README.md; ls ../..; ls ../../node_modules 2>/dev/null | head
```

```
Bash: cd ../.. && npx vitest run examples/products-consumer 2>&1 | tail -8; echo ======; PRODUCT_FIXTURE=examples/products-consumer/fixtures/product-v2.json npx vitest run examples/products-consumer 2>&1 | tail -25
```

```
Bash: cd ../.. && PRODUCT_FIXTURE=examples/products-consumer/fixtures/product-v2.json npx vitest run examples/products-consumer 2>&1 | tail -25
```

## Final answer (verbatim)

---

Yes, the change breaks it in two ways. The test only catches one of them.

`formatProduct` in `examples/products-consumer/format-product.ts:12` reads two fields, and both changed:

| Field | v1 | v2 | Effect on `formatProduct` |
|---|---|---|---|
| `price` | `89.99` (number) | `"89.99"` (string) | **Throws.** `product.price.toFixed is not a function`, because strings have no `toFixed`. |
| `title` | `"Nike Hoodie"` | removed, now sent as `name` | **Wrong output, no error.** `product.title` is `undefined`, so the card text would start with `"undefined: $"` instead of `"Nike Hoodie: $"`. |
| `inStock` | `true` | `"yes"` | No effect, because the code doesn't read it. Other code that does `if (product.inStock)` would still pass, but strict checks like `=== true` would fail. |
| `id` | unchanged | unchanged | — |

**What I ran:**
- Against v1, the default, the test passes.
- Against v2 (`PRODUCT_FIXTURE=examples/products-consumer/fixtures/product-v2.json npx vitest run examples/products-consumer`), it fails with the `TypeError` at `format-product.ts:12`.

**The test misses the title problem.** It only checks that the output contains `"$89.99"`. If you fixed only the price, the test would pass on v2 while the card still shows `"undefined: $89.99"`. TypeScript can't catch either problem, because the test casts the parsed JSON with `as Product` and nothing checks the data at runtime.

To support v2, read `name` instead of `title` and convert the price with `Number(product.price).toFixed(2)`. Then add `"Nike Hoodie"` to the test's assertion so it covers the title too. I can make those changes if you want.
