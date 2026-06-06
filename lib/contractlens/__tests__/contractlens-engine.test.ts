import { describe, expect, it } from "vitest";
import { inferSchema } from "../infer-schema";
import { compareSchemas } from "../compare-schemas";
import { formatDiff } from "../format-diff";

describe("ContractLens core engine", () => {
  it("infers, compares, and formats API response drift", () => {
    const baselineResponse = {
      id: "p_123",
      title: "Nike Hoodie",
      price: 89.99,
    };

    const latestResponse = {
      id: "p_123",
      name: "Nike Hoodie",
      price: "89.99",
    };

    const baselineSchema = inferSchema(baselineResponse);
    const latestSchema = inferSchema(latestResponse);

    const diffs = compareSchemas(baselineSchema, latestSchema);
    const messages = formatDiff(diffs);

    expect(messages).toEqual([
      "`title` is missing",
      "`price` changed from number to string",
      "`name` was added",
    ]);
  });
});
