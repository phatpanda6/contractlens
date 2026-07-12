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
  currentPath: string = "",
): SchemaDiff[] {
  const diffs: SchemaDiff[] = [];

  // Primitive schema changes represent a direct type mismatch at the current path.
  if (typeof expected === "string" && typeof actual === "string") {
    if (expected !== actual) {
      diffs.push({
        type: "TYPE_CHANGED",
        path: currentPath,
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
      const childPath = currentPath ? `${currentPath}.${key}` : key;
      if (!(key in actual)) {
        diffs.push({
          type: "MISSING_FIELD",
          path: childPath,
          severity: "breaking",
        });
      } else {
        diffs.push(...compareSchemas(expected[key], actual[key], childPath));
      }
    }

    // Second pass: detect fields added by the latest response.
    for (const key in actual) {
      const childPath = currentPath ? `${currentPath}.${key}` : key;
      if (!(key in expected)) {
        diffs.push({
          type: "NEW_FIELD",
          path: childPath,
          severity: "info",
        });
      }
    }
  }
  return diffs;
}
