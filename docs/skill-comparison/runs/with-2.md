# Run with-2 (with the skill)

Model: claude-opus-5-5. Turns: 7. Files changed: none.

## Tool calls

```
Skill: api-change-investigation
```

```
Bash: npm run --silent compare -- examples/products-consumer/fixtures/product-v1.json examples/products-consumer/fixtures/product-v2.json --json; echo "EXIT $?"
```

```
Grep: \b(title|price|inStock)\b
```

```
Bash: PRODUCT_FIXTURE=examples/products-consumer/fixtures/product-v1.json npx vitest run examples/products-consumer 2>&1 | tail -30; echo "EXIT ${pipestatus[1]}"
```

```
Bash: PRODUCT_FIXTURE=examples/products-consumer/fixtures/product-v2.json npx vitest run examples/products-consumer 2>&1 | tail -40; echo "EXIT ${pipestatus[1]}"
```

## Final answer (verbatim)

---

## API change investigation

Baseline: `examples/products-consumer/fixtures/product-v1.json`
Latest: `examples/products-consumer/fixtures/product-v2.json`
Consumer folder: `examples/products-consumer`
Compare command: 3 breaking, 1 info

| Field | Change | Schema verdict | Finding | Evidence |
|---|---|---|---|---|
| `price` | number -> string | breaking | Confirmed broken | Test fails on latest with `TypeError: product.price.toFixed is not a function` at `examples/products-consumer/format-product.ts:12:46` |
| `title` | removed | breaking | May be affected | Read at `examples/products-consumer/format-product.ts:12` (`product.title`) |
| `inStock` | boolean -> string | breaking | No usage found | No reads found in `examples/products-consumer` |
| `name` | added | info | Observed change only | — |

### Test evidence
Command: `PRODUCT_FIXTURE=examples/products-consumer/fixtures/product-v2.json npx vitest run examples/products-consumer`
Baseline run: passed (1 test, exit 0)
Latest run: failed (1 test failed, exit 1)
```
FAIL  examples/products-consumer/format-product.test.ts > formats the product price with two decimals
TypeError: product.price.toFixed is not a function
 ❯ formatProduct examples/products-consumer/format-product.ts:12:46
 ❯ examples/products-consumer/format-product.test.ts:18:10
```

### Not checked
- I searched only `examples/products-consumer`. Code elsewhere that reads these fields wasn't checked.
- The result is based on saved response files, not a live API.
- `title` is read on the same line that fails (`format-product.ts:12`), but the error doesn't name it, so it is not confirmed. The test stopped at the `price` error, and a code comment says the test leaves the title unchecked. So `title` may still be broken and should not be treated as safe.
- `title` and `name` are reported as two separate changes, a removal and an addition. They have not been checked as a rename.
