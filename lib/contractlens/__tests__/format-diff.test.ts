import { describe, expect, it } from "vitest";
import { formatDiff } from "../format-diff";

describe("formatDiff", () => {
  it("formats a missing field diff", () => {
    const result = formatDiff([
      {
        type: "MISSING_FIELD",
        path: "title",
        severity: "breaking",
      },
    ]);
    expect(result).toEqual(["`title` is missing"]);
  });

  it("formats a new field diff", () => {
    const result = formatDiff([
      {
        type: "NEW_FIELD",
        path: "name",
        severity: "info",
      },
    ]);
    expect(result).toEqual(["`name` was added"]);
  });

  it("formats a type changed diff", () => {
    const result = formatDiff([
      {
        type: "TYPE_CHANGED",
        path: "price",
        from: "number",
        to: "string",
        severity: "breaking",
      },
    ]);
    expect(result).toEqual(["`price` changed from number to string"]);
  });

  it("formats multiple diffs", () => {
    const result = formatDiff([
      {
        type: "MISSING_FIELD",
        path: "title",
        severity: "breaking",
      },
      {
        type: "NEW_FIELD",
        path: "name",
        severity: "info",
      },
    ]);

    expect(result).toEqual(["`title` is missing", "`name` was added"]);
  });
});
