import { describe, expect, it } from "vitest";
import {
  formatSummary,
  parseTestFailures,
  parseTypeErrors,
} from "./summary.mjs";

describe("parseTypeErrors", () => {
  it("reads file, line and message from tsc output", () => {
    const output = [
      "app/page.tsx(12,5): error TS2339: Property 'x' does not exist on type 'Y'.",
      "some unrelated line",
    ].join("\n");

    expect(parseTypeErrors(output)).toEqual([
      {
        file: "app/page.tsx",
        line: 12,
        message: "Property 'x' does not exist on type 'Y'.",
      },
    ]);
  });
});

describe("parseTestFailures", () => {
  it("lists failed tests with a short path and the first line of the error", () => {
    const report = {
      testResults: [
        {
          name: "/repo/app/a.test.ts",
          status: "failed",
          assertionResults: [
            { status: "passed", fullName: "ok" },
            {
              status: "failed",
              fullName: "builds the card",
              failureMessages: ["\nTypeError: x is not a function\n    at line"],
            },
          ],
        },
      ],
    };

    expect(parseTestFailures(report, "/repo")).toEqual([
      {
        file: "app/a.test.ts",
        test: "builds the card",
        message: "TypeError: x is not a function",
      },
    ]);
  });

  it("reports a file that failed before any test ran", () => {
    const report = {
      testResults: [
        {
          name: "/repo/b.test.ts",
          status: "failed",
          message: "Cannot find module './gone'",
          assertionResults: [],
        },
      ],
    };

    expect(parseTestFailures(report, "/repo")[0]).toMatchObject({
      file: "b.test.ts",
      message: "Cannot find module './gone'",
    });
  });

  it("returns nothing for a missing or unreadable report", () => {
    expect(parseTestFailures(null, "/repo")).toEqual([]);
  });
});

describe("formatSummary", () => {
  it("is empty when everything passed", () => {
    expect(formatSummary({ typeErrors: [], testFailures: [] })).toBe("");
  });

  it("caps each section at the limit", () => {
    const typeErrors = Array.from({ length: 5 }, (_, i) => ({
      file: "a.ts",
      line: i + 1,
      message: "bad",
    }));

    const summary = formatSummary({ typeErrors, testFailures: [] }, 2);

    expect(summary).toContain("Type errors (5):");
    expect(summary).toContain("- a.ts:1 bad");
    expect(summary).toContain("- ...and 3 more");
    expect(summary).not.toContain("a.ts:3");
  });
});
