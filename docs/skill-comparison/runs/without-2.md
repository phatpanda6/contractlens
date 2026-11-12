# Run without-2 (without the skill)

Model: claude-opus-5-5. Turns: 4. Files changed: none.

## Tool calls

```
Bash: cd examples/products-consumer && find . -type f -not -path '*/node_modules/*' | head -50 && cat fixtures/product-v1.json fixtures/product-v2.json
```

```
Bash: cat format-product.ts format-product.test.ts README.md
```

```
Bash: cd ../.. && ls; (npx vitest run examples/products-consumer 2>&1 | tail -15); echo ----; (PRODUCT_FIXTURE=examples/products-consumer/fixtures/product-v2.json npx vitest run examples/products-consumer 2>&1 | tail -25)
```

## Final answer (verbatim)

---

Yes, it breaks in two ways. I ran the test against both files: it passes on v1 and fails on v2.

**1. `price` changed from a number to a string, so the code crashes.** The test fails with this error:

```
TypeError: product.price.toFixed is not a function
 ❯ formatProduct examples/products-consumer/format-product.ts:12:46
```

`"89.99".toFixed(2)` doesn't exist, so `formatProduct` throws on every v2 product.

**2. `title` was renamed to `name`, so the output is wrong, with no error.** `format-product.ts:12` reads `product.title`, which is `undefined` in v2. Once the price crash is fixed, the card would show `"undefined: $89.99"`. The test won't catch this, because it only checks for `"$89.99"` and leaves the title untested. TypeScript won't catch it either: the `as Product` cast in the test (and in real code that trusts the API) skips type checking.

**Not a break here:** `inStock` changed from the boolean `true` to the string `"yes"`, but this code never reads it. Any other code that does `if (product.inStock)` would now treat `"no"` as in stock, because any non-empty string counts as true.

To fix this, read `name` (or `name ?? title` if both versions need to work) and convert the price with `Number(product.price)` before calling `.toFixed(2)`. It's also worth adding a test assertion on the title.
