import type { SchemaDiff } from "./types";

// Converts structured schema diffs into readable messages for UI or CLI output.
export function formatDiff(diffs: SchemaDiff[]): string[] {
  return diffs.map((diff) => {
    switch (diff.type) {
      case "MISSING_FIELD":
        return `\`${diff.path}\` is missing`;

      case "NEW_FIELD":
        return `\`${diff.path}\` was added`;

      case "TYPE_CHANGED":
        return `\`${diff.path}\` changed from ${diff.from} to ${diff.to}`;

      default:
        return `Unknown diff at \`${diff.path}\``;
    }
  });
}
