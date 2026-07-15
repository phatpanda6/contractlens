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
        path: "$",
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

  it("returns the full path when a nested field is added", () => {
    const result = compareSchemas(
      {
        user: {
          profile: {},
        },
      },
      {
        user: {
          profile: {
            active: "boolean",
          },
        },
      },
    );

    expect(result).toEqual([
      {
        type: "NEW_FIELD",
        path: "user.profile.active",
        severity: "info",
      },
    ]);
  });

  it("returns a root type change when an object becomes an array", () => {
    const result = compareSchemas(
      {
        user: {},
      },
      [],
    );

    expect(result).toEqual([
      {
        type: "TYPE_CHANGED",
        path: "$",
        severity: "breaking",
        from: "object",
        to: "array",
      },
    ]);
  });

  it("returns the nested path when an object becomes an array", () => {
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
          profile: [],
        },
      },
    );

    expect(result).toEqual([
      {
        type: "TYPE_CHANGED",
        path: "user.profile",
        severity: "breaking",
        from: "object",
        to: "array",
      },
    ]);
  });

  it("returns a type change when array item types differ", () => {
    const result = compareSchemas(
      {
        prices: ["number"],
      },
      {
        prices: ["string"],
      },
    );

    expect(result).toEqual([
      {
        type: "TYPE_CHANGED",
        path: "prices[]",
        severity: "breaking",
        from: "number",
        to: "string",
      },
    ]);
  });

  it("returns the item field path when an array object field changes type", () => {
    const result = compareSchemas(
      {
        products: [
          {
            id: "string",
            price: "number",
          },
        ],
      },
      {
        products: [
          {
            id: "string",
            price: "string",
          },
        ],
      },
    );

    expect(result).toEqual([
      {
        type: "TYPE_CHANGED",
        path: "products[].price",
        severity: "breaking",
        from: "number",
        to: "string",
      },
    ]);
  });

  it("returns no diffs when array item types match", () => {
    const result = compareSchemas(["number"], ["number"]);

    expect(result).toEqual([]);
  });

  it("returns no diffs when the baseline array is empty", () => {
    const result = compareSchemas([], [{ id: "string" }]);

    expect(result).toEqual([]);
  });

  it("returns no diffs when the latest array is empty", () => {
    const result = compareSchemas([{ id: "string" }], []);

    expect(result).toEqual([]);
  });

  it("returns a root item type change when root array item types differ", () => {
    const result = compareSchemas(["number"], ["string"]);

    expect(result).toEqual([
      {
        type: "TYPE_CHANGED",
        path: "$[]",
        severity: "breaking",
        from: "number",
        to: "string",
      },
    ]);
  });

  it("returns a breaking type change when a nested number becomes null", () => {
    const result = compareSchemas(
      {
        product: {
          price: "number",
        },
      },
      {
        product: {
          price: "null",
        },
      },
    );

    expect(result).toEqual([
      {
        type: "TYPE_CHANGED",
        path: "product.price",
        severity: "breaking",
        from: "number",
        to: "null",
      },
    ]);
  });

  it("returns a root type change when null becomes an object", () => {
    const result = compareSchemas("null", {
      id: "string",
    });

    expect(result).toEqual([
      {
        type: "TYPE_CHANGED",
        path: "$",
        severity: "breaking",
        from: "null",
        to: "object",
      },
    ]);
  });

  it("returns a root type change when an array becomes an object", () => {
    const result = compareSchemas(["string"], {
      value: "string",
    });

    expect(result).toEqual([
      {
        type: "TYPE_CHANGED",
        path: "$",
        severity: "breaking",
        from: "array",
        to: "object",
      },
    ]);
  });

  it("returns a nested type change when an object becomes a primitive", () => {
    const result = compareSchemas(
      {
        product: {
          details: {
            description: "string",
          },
        },
      },
      {
        product: {
          details: "string",
        },
      },
    );

    expect(result).toEqual([
      {
        type: "TYPE_CHANGED",
        path: "product.details",
        severity: "breaking",
        from: "object",
        to: "string",
      },
    ]);
  });
});
