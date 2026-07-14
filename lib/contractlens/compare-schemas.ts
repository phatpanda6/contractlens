import type { JsonSchemaShape, SchemaDiff } from "./types";

function isObjectSchema(
  schema: JsonSchemaShape,
): schema is { [key: string]: JsonSchemaShape } {
  // Array schemas are also reported as "object" by typeof, so exclude them explicitly.
  return typeof schema === "object" && !Array.isArray(schema);
}

function getSchemaType(schema: JsonSchemaShape): string {
  if (Array.isArray(schema)) {
    return "array";
  }

  if (isObjectSchema(schema)) {
    return "object";
  }

  return schema;
}

export function compareSchemas(
  expected: JsonSchemaShape,
  actual: JsonSchemaShape,
  currentPath: string = "",
): SchemaDiff[] {
  const diffs: SchemaDiff[] = [];
  const expectedType = getSchemaType(expected);
  const actualType = getSchemaType(actual);

  // Check if the response is the same type at all
  if (expectedType !== actualType) {
    diffs.push({
      type: "TYPE_CHANGED",
      path: currentPath || "$",
      severity: "breaking",
      from: expectedType,
      to: actualType,
    });
    return diffs;
  }

  // Compare representative item schemas when both schemas are arrays.
  if (Array.isArray(expected) && Array.isArray(actual)) {
    // If either array is empty, its item schema is unknown.
    if (expected.length === 0 || actual.length === 0) {
      return diffs;
    }

    const itemPath = currentPath ? `${currentPath}[]` : "$[]";

    const itemDiffs = compareSchemas(expected[0], actual[0], itemPath);

    return itemDiffs;
  }

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
