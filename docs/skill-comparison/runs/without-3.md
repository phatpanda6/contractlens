# Run without-3 (without the skill)

Model: claude-opus-5-5. Turns: 5. Files changed: none.

## Tool calls

```
Bash: cd examples/products-consumer && find . -type f -not -path '*/node_modules/*' | head -50 && echo --- && cat fixtures/product-v1.json && echo --- && cat fixtures/product-v2.json
```

```
Bash: cat format-product.ts; echo ---; cat format-product.test.ts; echo ---; cat README.md; ls ..; ls ../..
```

```
Bash: cd ../.. && npx vitest run examples/products-consumer 2>&1 | tail -8; echo ======; PRODUCT_FIXTURE=examples/products-consumer/fixtures/product-v2.json npx vitest run examples/products-consumer 2>&1 | tail -25
```

```
Bash: cd ../.. && PRODUCT_FIXTURE=examples/products-consumer/fixtures/product-v2.json npx vitest run examples/products-consumer 2>&1 | tail -25
```

## Final answer (verbatim)

---

Yes, it breaks. The consumer only uses two fields, `title` and `price`, and the v2 response changes both.

| Field | v1 | v2 | What happens in `format-product.ts` |
|---|---|---|---|
| `price` | `89.99` (number) | `"89.99"` (string) | **Crashes.** `product.price.toFixed(2)` throws `TypeError: product.price.toFixed is not a function` (`examples/products-consumer/format-product.ts:12`) |
| `title` → `name` | `"title": "Nike Hoodie"` | `"name": "Nike Hoodie"` | **Silently wrong.** `product.title` is `undefined`, so the card would read `undefined: $89.99` |
| `inStock` | `true` | `"yes"` | No effect, because this code never reads it |
| `id` | unchanged | unchanged | No effect |

I ran the test against both responses. It passes on v1 and fails on v2 with the `toFixed` TypeError above.

**The test only catches the first problem.** It checks for `$89.99` and never looks at the title. If you fixed only the price (for example `Number(product.price).toFixed(2)`), the test would pass while the card still shows `undefined` as the product name. The TypeScript `Product` type doesn't help either: the test casts the JSON with `as Product`, so the compiler never sees what the API actually returns.

To work with v2, the consumer needs to read `name` instead of `title` and turn `price` into a number before formatting it. It's also worth adding a check on the title to the test. If you want, I can make those changes.
