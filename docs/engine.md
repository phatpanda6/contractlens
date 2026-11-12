# Core engine

Part of the [ContractLens README](../README.md).

## Core Engine

The core engine lives in `lib/contractlens`.

```text
lib/contractlens/
  types.ts
  infer-schema.ts
  compare-schemas.ts
  format-diff.ts
  compare-responses.ts
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

### `compareResponses()`

`compareResponses()` takes two parsed responses, runs the functions above, and summarises the result. The compare command and the skill both use it.

Example:

```ts
compareResponses({ price: 89.99 }, { price: "89.99" });
```

Returns:

```ts
{
  verdict: "breaking",
  counts: { breaking: 1, info: 0, total: 1 },
  diffs: [
    {
      type: "TYPE_CHANGED",
      path: "price",
      severity: "breaking",
      from: "number",
      to: "string",
    },
  ],
}
```

## Change Classification

Breaking changes:

- Removed field
- Type changed

Informational changes:

- New field added

The product treats new fields as informational because existing frontend code can usually ignore extra response fields.
