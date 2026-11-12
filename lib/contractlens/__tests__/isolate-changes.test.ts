import { describe, expect, it } from "vitest";
import { isolateChanges } from "..";

// Returns the isolated response for one path, or fails the test if that
// change was not isolated.
function responseFor(
  changes: ReturnType<typeof isolateChanges>,
  path: string,
): unknown {
  const change = changes.find((item) => item.diff.path === path);
  if (!change || !change.isolated) {
    throw new Error(`no isolated response for ${path}`);
  }
  return change.response;
}

describe("isolateChanges", () => {
  const baseline = { id: "p_1", title: "Hoodie", price: 89.99 };
  const latest = { id: "p_1", name: "Hoodie", price: "89.99" };

  it("returns one entry per detected change", () => {
    const changes = isolateChanges(baseline, latest);

    expect(changes.map((change) => change.diff.path)).toEqual([
      "title",
      "price",
      "name",
    ]);
  });

  it("applies a type change on its own", () => {
    const changes = isolateChanges(baseline, latest);

    expect(responseFor(changes, "price")).toEqual({
      id: "p_1",
      title: "Hoodie",
      price: "89.99",
    });
  });

  it("applies a removed field on its own", () => {
    const changes = isolateChanges(baseline, latest);

    expect(responseFor(changes, "title")).toEqual({ id: "p_1", price: 89.99 });
  });

  it("applies an added field on its own", () => {
    const changes = isolateChanges(baseline, latest);

    expect(responseFor(changes, "name")).toEqual({
      id: "p_1",
      title: "Hoodie",
      price: 89.99,
      name: "Hoodie",
    });
  });

  it("applies a nested change without touching sibling fields", () => {
    const changes = isolateChanges(
      { run: { createdAt: "2026-01-01", status: "FAIL" }, total: 1 },
      { run: { createdAt: 1767225600000, status: "PASS" }, total: "1" },
    );

    expect(responseFor(changes, "run.createdAt")).toEqual({
      run: { createdAt: 1767225600000, status: "FAIL" },
      total: 1,
    });
  });

  it("uses the whole latest response when the root type changed", () => {
    const changes = isolateChanges({ id: 1 }, [{ id: 1 }]);

    expect(changes).toHaveLength(1);
    expect(responseFor(changes, "$")).toEqual([{ id: 1 }]);
  });

  it("reports a change inside an array as not isolated", () => {
    const changes = isolateChanges(
      { items: [{ price: 1 }] },
      { items: [{ price: "1" }] },
    );

    expect(changes).toEqual([
      {
        diff: expect.objectContaining({ path: "items[].price" }),
        isolated: false,
        reason: "changes inside arrays cannot be isolated yet",
      },
    ]);
  });

  it("returns nothing for identical responses", () => {
    expect(isolateChanges(baseline, baseline)).toEqual([]);
  });

  it("does not modify its inputs", () => {
    const baselineCopy = structuredClone(baseline);
    const latestCopy = structuredClone(latest);

    isolateChanges(baseline, latest);

    expect(baseline).toEqual(baselineCopy);
    expect(latest).toEqual(latestCopy);
  });
});
