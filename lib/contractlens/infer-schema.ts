import type { JsonSchemaShape } from "./types";

// Infers a simplified type-shape from real API response data.
export function inferSchema(value: unknown): JsonSchemaShape {
  // null and arrays must be checked before objects because both are reported
  // as "object" by JavaScript's typeof operator.

  //Checks if the api response is INTENTIONALLY null
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [];
    }

    // MVP behavior: infer array shape from the first item only.
    return [inferSchema(value[0])];
  }

  //This code will run if value is an object

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const schema: { [key: string]: JsonSchemaShape } = {};

    for (const key in objectValue) {
      schema[key] = inferSchema(objectValue[key]);
    }
    return schema;
  }

  //Primitive checks if value is one simple value

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
