import { describe, expect, it } from "vitest";
import { compareSchemas } from "../compare-schemas";

describe("compareSchemas", () => {
  it("returns no diffs when primitive schemas are the same", () => {
    const result = compareSchemas("string", "string");
    expect(result).toEqual([]);
  });

  it("returns a type change when the primitive schemas are different", () => {
    const result = compareSchemas("number", "string");
    expect(result).toEqual([
      {
        type: "TYPE_CHANGED",
        path: "",
        severity: "breaking",
        from: "number",
        to: "string",
      },
    ]);
  });

  it("returns a missing field when the schema is missing an object field", () => {
    const result = compareSchemas(
      { id: "string", title: "string" },
      { id: "string" },
    );
    expect(result).toEqual([
      {
        type: "MISSING_FIELD",
        path: "title",
        severity: "breaking",
      },
    ]);
  });

  it("returns a new field diff when the actual schema adds a field", () => {
    const result = compareSchemas(
      { id: "string" },
      { id: "string", name: "string" },
    );
    expect(result).toEqual([
      {
        type: "NEW_FIELD",
        path: "name",
        severity: "info",
      },
    ]);
  });

  it("returns a type change when a shared object field changes type", () => {
    const result = compareSchemas({ price: "string" }, { price: "number" });
    expect(result).toEqual([
      {
        type: "TYPE_CHANGED",
        path: "price",
        severity: "breaking",
        from: "string",
        to: "number",
      },
    ]);
  });

  it("returns no diffs when object schemas are identical", () => {
    const result = compareSchemas(
      { id: "string", price: "number" },
      { id: "string", price: "number" },
    );
    expect(result).toEqual([]);
  });

  it("returns the full path when a nested field is missing", () => {
    const result = compareSchemas(
      {
        user: {
          profile: {
            name: "string",
          },
        },
      },
      {
        user: {
          profile: {},
        },
      },
    );

    expect(result).toEqual([
      {
        type: "MISSING_FIELD",
        path: "user.profile.name",
        severity: "breaking",
      },
    ]);
  });
});
