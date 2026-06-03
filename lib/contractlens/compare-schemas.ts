import type { JsonSchemaShape, SchemaDiff } from "./types";

function isObjectSchema(
  schema: JsonSchemaShape,
): schema is { [key: string]: JsonSchemaShape } {
  // Array schemas are also reported as "object" by typeof, so exclude them explicitly.
  return typeof schema === "object" && !Array.isArray(schema);
}

export function compareSchemas(
  expected: JsonSchemaShape,
  actual: JsonSchemaShape,
): SchemaDiff[] {
  const diffs: SchemaDiff[] = [];

  // Primitive schema changes represent a direct type mismatch at the current path.
  if (typeof expected === "string" && typeof actual === "string") {
    if (expected !== actual) {
      diffs.push({
        type: "TYPE_CHANGED",
        path: "",
        severity: "breaking",
        from: expected,
        to: actual,
      });
    }
    return diffs;
  }

  // Object schemas capture response-shape drift, such as removed, added, or changed fields.
  if (isObjectSchema(expected) && isObjectSchema(actual)) {
    // First pass: detect removed fields and primitive type changes.
    for (const key in expected) {
      if (!(key in actual)) {
        diffs.push({
          type: "MISSING_FIELD",
          path: key,
          severity: "breaking",
        });
      } else {
        if (
          typeof actual[key] === "string" &&
          typeof expected[key] === "string" &&
          actual[key] !== expected[key]
        ) {
          diffs.push({
            type: "TYPE_CHANGED",
            path: key,
            severity: "breaking",
            from: expected[key],
            to: actual[key],
          });
        }
      }
    }

    // Second pass: detect fields added by the latest response.
    for (const key in actual) {
      if (!(key in expected)) {
        diffs.push({
          type: "NEW_FIELD",
          path: key,
          severity: "info",
        });
      }
    }
  }
  return diffs;
}
