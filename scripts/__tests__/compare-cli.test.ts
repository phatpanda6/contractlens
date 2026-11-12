import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { compareResponses } from "../../lib/contractlens";
import { demoProductV1, demoProductV2 } from "../../lib/contractlens/demo-data";
import { runCompareCli } from "../compare-cli";

// Vitest runs from the project root, so these paths resolve from there.
const fixtures = path.join("lib", "contractlens", "__tests__", "fixtures");
const v1 = path.join(fixtures, "product-v1.json");
const v2 = path.join(fixtures, "product-v2.json");
const infoOnly = path.join(fixtures, "product-info-only.json");
const invalid = path.join(fixtures, "invalid.json");

describe("runCompareCli", () => {
  it("exits 1 and lists the changes when there are breaking changes", () => {
    const result = runCompareCli([v1, v2]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Breaking changes detected");
    expect(result.stdout).toContain("[breaking] `title` is missing");
    expect(result.stdout).toContain("[info] `name` was added");
    expect(result.stderr).toBe("");
  });

  it("exits 0 when the only change is informational", () => {
    const result = runCompareCli([v1, infoOnly]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No breaking changes detected");
    expect(result.stdout).toContain("[info] `brand` was added");
  });

  it("exits 0 when the responses are identical", () => {
    const result = runCompareCli([v1, v1]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("0 breaking, 0 info");
  });

  it("prints the same result as compareResponses with --json", () => {
    const result = runCompareCli([v1, v2, "--json"]);

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toEqual(
      compareResponses(demoProductV1, demoProductV2),
    );
  });

  it("exits 2 and names the file when a file is not valid JSON", () => {
    const result = runCompareCli([v1, invalid]);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("not valid JSON");
    expect(result.stderr).toContain(invalid);
  });

  it("exits 2 when a file does not exist", () => {
    const result = runCompareCli([v1, "does-not-exist.json"]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Cannot read file: does-not-exist.json");
  });

  it("exits 2 when it is not given exactly two files", () => {
    expect(runCompareCli([]).exitCode).toBe(2);
    expect(runCompareCli([v1]).exitCode).toBe(2);
    expect(runCompareCli([v1, v2, v1]).exitCode).toBe(2);
  });

  it("exits 2 for an option it does not know", () => {
    const result = runCompareCli([v1, v2, "--verbose"]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Unknown option: --verbose");
  });
});

// One test starts the real command, to prove the exit code reaches the shell.
describe("npm run compare (real process)", () => {
  it("exits 1 for v1 -> v2", () => {
    const tsx = path.join("node_modules", ".bin", "tsx");
    const child = spawnSync(tsx, ["scripts/compare.ts", v1, v2], {
      encoding: "utf8",
    });

    expect(child.status).toBe(1);
    expect(child.stdout).toContain("Breaking changes detected");
  });
});
