import { describe, expect, it } from "vitest";
import { inferSchema, compareSchemas, formatDiff } from "..";
import { demoProductV1, demoProductV2 } from "../demo-data";

describe("ContractLens core engine", () => {
  it("infers, compares, and formats API response drift", () => {
    const baselineResponse = demoProductV1;

    const latestResponse = demoProductV2;

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
