import { describe, expect, it } from "vitest";
import { inferSchema } from "../infer-schema";

describe("inferSchema", () => {
  it("returns string for a string value", () => {
    const result = inferSchema("hello");
    expect(result).toEqual("string");
  });

  it("returns number for a number value", () => {
    const result = inferSchema(123);
    expect(result).toEqual("number");
  });

  it("returns boolean for a boolean value", () => {
    const result = inferSchema(true);
    expect(result).toEqual("boolean");
  });

  it("returns null for a null value", () => {
    const result = inferSchema(null);
    expect(result).toEqual("null");
  });

  it("returns undefined for an undefined value", () => {
    const result = inferSchema(undefined);
    expect(result).toEqual("undefined");
  });

  it("returns an empty schema for an empty array", () => {
    const result = inferSchema([]);
    expect(result).toEqual([]);
  });

  it("returns the first item schema for an array of primitive values", () => {
    const result = inferSchema(["sale", "new"]);
    expect(result).toEqual(["string"]);
  });

  it("returns a schema for a simple object", () => {
    const result = inferSchema({ id: "p_123", price: 89.99 });
    expect(result).toEqual({ id: "string", price: "number" });
  });

  it("returns a schema for a nested object", () => {
    const result = inferSchema({ user: { name: "James" } });
    expect(result).toEqual({ user: { name: "string" } });
  });

  it("returns the first item schema for an array of objects", () => {
    const result = inferSchema([{ id: "p_123" }]);
    expect(result).toEqual([{ id: "string" }]);
  });

  it("uses the first item schema for heterogeneous arrays", () => {
    const result = inferSchema(["sale", 123, true]);
    expect(result).toEqual(["string"]);
  });
});
