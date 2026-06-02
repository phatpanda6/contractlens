import type { JsonSchemaShape, SchemaDiff } from "./types";

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
  }

  return diffs;
}
