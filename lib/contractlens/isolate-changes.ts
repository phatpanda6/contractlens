import { compareResponses } from "./compare-responses";
import type { SchemaDiff } from "./types";

// One detected change, with a copy of the baseline response that has only
// that change applied. Changes that cannot be applied on their own are
// returned with the reason instead.
export type IsolatedChange =
  | { diff: SchemaDiff; isolated: true; response: unknown }
  | { diff: SchemaDiff; isolated: false; reason: string };

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Follows keys into nested objects. Returns undefined if any step is not an
// object, so callers can tell the path could not be followed.
function objectAt(root: unknown, keys: string[]): JsonObject | undefined {
  let current = root;
  for (const key of keys) {
    if (!isObject(current)) return undefined;
    current = current[key];
  }
  return isObject(current) ? current : undefined;
}

// For each change between two responses, builds the baseline with only that
// one change applied. Running a test against each result shows which change
// breaks the consumer, even when another change would fail first.
// Pure: the inputs are never modified.
export function isolateChanges(
  baseline: unknown,
  latest: unknown,
): IsolatedChange[] {
  const { diffs } = compareResponses(baseline, latest);

  return diffs.map((diff): IsolatedChange => {
    // "$" means the whole response changed type, so the change is the
    // latest response itself.
    if (diff.path === "$") {
      return { diff, isolated: true, response: structuredClone(latest) };
    }

    // A path such as "items[].price" describes every item of an array.
    // Applying that to one response is not supported yet.
    if (diff.path.includes("[]")) {
      return {
        diff,
        isolated: false,
        reason: "changes inside arrays cannot be isolated yet",
      };
    }

    const keys = diff.path.split(".");
    const field = keys[keys.length - 1];
    const parentKeys = keys.slice(0, -1);

    // Work on a copy so the caller's baseline stays untouched.
    const response = structuredClone(baseline);
    const parent = objectAt(response, parentKeys);
    const latestParent = objectAt(latest, parentKeys);

    if (!parent || !latestParent) {
      return {
        diff,
        isolated: false,
        reason: `could not follow the path "${diff.path}"`,
      };
    }

    if (diff.type === "MISSING_FIELD") {
      delete parent[field];
    } else {
      // NEW_FIELD and TYPE_CHANGED both take the value from the latest response.
      parent[field] = structuredClone(latestParent[field]);
    }

    return { diff, isolated: true, response };
  });
}
