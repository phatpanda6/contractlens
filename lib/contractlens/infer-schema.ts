import type { JsonSchemaShape } from "./types";

export function inferSchema(value: unknown): JsonSchemaShape {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [];
    }
    return [inferSchema(value[0])];
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const schema: { [key: string]: JsonSchemaShape } = {};

    for (const key in objectValue) {
      schema[key] = inferSchema(objectValue[key]);
    }
    return schema;
  }

  if (typeof value === "string") {
    return "string";
  }

  if (typeof value === "number") {
    return "number";
  }

  if (typeof value === "boolean") {
    return "boolean";
  }

  if (typeof value === "undefined") {
    return "undefined";
  }

  return "undefined";
}
