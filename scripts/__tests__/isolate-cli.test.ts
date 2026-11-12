import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runIsolateCli } from "../isolate-cli";

const fixtures = path.join("lib", "contractlens", "__tests__", "fixtures");
const v1 = path.join(fixtures, "product-v1.json");
const v2 = path.join(fixtures, "product-v2.json");
const invalid = path.join(fixtures, "invalid.json");

describe("runIsolateCli", () => {
  let outDir: string;

  // Each test writes into its own temporary folder, removed afterwards.
  beforeEach(() => {
    outDir = mkdtempSync(path.join(tmpdir(), "contractlens-isolate-"));
  });
  afterEach(() => {
    rmSync(outDir, { recursive: true, force: true });
  });

  it("writes one file per change and lists them", () => {
    const result = runIsolateCli([v1, v2, "--out", outDir]);

    expect(result.exitCode).toBe(0);
    expect(readdirSync(outDir).sort()).toEqual([
      "1-title.json",
      "2-price.json",
      "3-name.json",
    ]);

    const { changes } = JSON.parse(result.stdout);
    expect(changes).toEqual([
      {
        path: "title",
        type: "MISSING_FIELD",
        severity: "breaking",
        file: path.join(outDir, "1-title.json"),
      },
      {
        path: "price",
        type: "TYPE_CHANGED",
        severity: "breaking",
        file: path.join(outDir, "2-price.json"),
      },
      {
        path: "name",
        type: "NEW_FIELD",
        severity: "info",
        file: path.join(outDir, "3-name.json"),
      },
    ]);
  });

  it("writes the baseline with only that change applied", () => {
    runIsolateCli([v1, v2, "--out", outDir]);

    const priceOnly = JSON.parse(
      readFileSync(path.join(outDir, "2-price.json"), "utf8"),
    );
    expect(priceOnly).toEqual({
      id: "p_123",
      title: "Nike Hoodie",
      price: "89.99",
      inStock: true,
    });
  });

  it("writes no files for identical responses", () => {
    const result = runIsolateCli([v1, v1, "--out", outDir]);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ changes: [] });
    expect(readdirSync(outDir)).toEqual([]);
  });

  it("exits 2 without --out", () => {
    const result = runIsolateCli([v1, v2]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Expected --out <folder>.");
  });

  it("exits 2 when a file is missing or not valid JSON", () => {
    expect(runIsolateCli([v1, "nope.json", "--out", outDir]).exitCode).toBe(2);
    expect(runIsolateCli([v1, invalid, "--out", outDir]).exitCode).toBe(2);
    expect(readdirSync(outDir)).toEqual([]);
  });

  it("exits 2 when it is not given exactly two files", () => {
    expect(runIsolateCli([v1, "--out", outDir]).exitCode).toBe(2);
  });
});
