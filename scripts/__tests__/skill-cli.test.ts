import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCompareCli } from "../compare-cli";
import { buildSkillBundle, SKILL_BUNDLE_PATH } from "../skill-bundle";
import { runSkillCli } from "../skill-cli";

const fixtures = path.join("lib", "contractlens", "__tests__", "fixtures");
const v1 = path.join(fixtures, "product-v1.json");
const v2 = path.join(fixtures, "product-v2.json");
const invalid = path.join(fixtures, "invalid.json");

// Runs the committed bundle the way the skill does: plain `node`, no tsx.
function runBundle(args: string[]) {
  const result = spawnSync("node", [SKILL_BUNDLE_PATH, ...args], {
    encoding: "utf8",
  });
  return {
    exitCode: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

describe("runSkillCli", () => {
  it("passes `compare` to the compare command", () => {
    expect(runSkillCli(["compare", v1, v2])).toEqual(runCompareCli([v1, v2]));
  });

  it("passes `isolate` to the isolate command", () => {
    const outDir = mkdtempSync(path.join(tmpdir(), "contractlens-skill-"));
    try {
      const result = runSkillCli(["isolate", v1, v2, "--out", outDir]);

      expect(result.exitCode).toBe(0);
      expect(readdirSync(outDir)).toHaveLength(3);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("exits 2 for an unknown or missing command", () => {
    expect(runSkillCli(["nope"]).exitCode).toBe(2);
    expect(runSkillCli([]).stderr).toContain("Unknown command: (none)");
  });
});

describe("the bundled checker in the skill folder", () => {
  it("is up to date with the source", async () => {
    // If this fails, run `npm run build:skill` and commit the result.
    expect(readFileSync(SKILL_BUNDLE_PATH, "utf8")).toBe(
      await buildSkillBundle(),
    );
  });

  it("gives the same result as the compare command when run with node", () => {
    const expected = runCompareCli([v1, v2, "--json"]);
    const actual = runBundle(["compare", v1, v2, "--json"]);

    expect(actual.exitCode).toBe(1);
    expect(actual.stdout).toBe(expected.stdout);
  });

  it("exits 0 for identical responses and 2 for invalid input", () => {
    expect(runBundle(["compare", v1, v1]).exitCode).toBe(0);
    expect(runBundle(["compare", v1, invalid]).exitCode).toBe(2);
  });
});
