import { describe, expect, it } from "vitest";
import { compareResponses } from "..";
import { demoProductV1, demoProductV2 } from "../demo-data";

describe("compareResponses", () => {
  it("reports a number -> string change as breaking", () => {
    const result = compareResponses({ price: 89.99 }, { price: "89.99" });

    expect(result.verdict).toBe("breaking");
    expect(result.counts).toEqual({ breaking: 1, info: 0, total: 1 });
    expect(result.diffs).toEqual([
      {
        type: "TYPE_CHANGED",
        path: "price",
        severity: "breaking",
        from: "number",
        to: "string",
      },
    ]);
  });

  it("reports the v1 -> v2 demo change without inferring a rename", () => {
    const result = compareResponses(demoProductV1, demoProductV2);

    expect(result.verdict).toBe("breaking");
    expect(result.counts).toEqual({ breaking: 2, info: 1, total: 3 });
    // title and name stay two separate facts: one missing, one new.
    expect(result.diffs.map((diff) => `${diff.type} ${diff.path}`)).toEqual([
      "MISSING_FIELD title",
      "TYPE_CHANGED price",
      "NEW_FIELD name",
    ]);
  });

  it("does not call an added field breaking", () => {
    const result = compareResponses(demoProductV1, {
      ...demoProductV1,
      brand: "Nike",
    });

    expect(result.verdict).toBe("no_breaking_changes");
    expect(result.counts).toEqual({ breaking: 0, info: 1, total: 1 });
  });

  it("reports identical responses as no breaking changes with zero diffs", () => {
    const result = compareResponses(demoProductV1, demoProductV1);

    expect(result.verdict).toBe("no_breaking_changes");
    expect(result.counts).toEqual({ breaking: 0, info: 0, total: 0 });
    expect(result.diffs).toEqual([]);
  });
});
