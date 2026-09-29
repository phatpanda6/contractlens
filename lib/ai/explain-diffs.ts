import { generateText } from "ai";

export async function explainDiffs(diffs: unknown): Promise<string> {
  if (
    !process.env.AI_GATEWAY_API_KEY ||
    process.env.AI_GATEWAY_API_KEY.trim().length === 0
  ) {
    throw new Error("Gateway API key is not configured");
  }

  if (!Array.isArray(diffs)) {
    throw new Error("Invalid stored diffs");
  }

  const diffsHasValidStructure = diffs.every(
    (diff) =>
      diff !== null &&
      typeof diff === "object" &&
      (diff.type === "MISSING_FIELD" ||
        diff.type === "NEW_FIELD" ||
        (diff.type === "TYPE_CHANGED" &&
          typeof diff.from === "string" &&
          typeof diff.to === "string")) &&
      typeof diff.path === "string" &&
      (diff.severity === "breaking" || diff.severity === "info") &&
      (diff.from === undefined || typeof diff.from === "string") &&
      (diff.to === undefined || typeof diff.to === "string"),
  );

  if (!diffsHasValidStructure) {
    throw new Error("Invalid stored diffs");
  }

  const safeDiffs = diffs.map((diff) => ({
    type: diff.type,
    path: diff.path,
    severity: diff.severity,
    from: diff.from,
    to: diff.to,
  }));

  const result = await generateText({
    model: "openai/gpt-5.4-nano",
    prompt: `Use only the supplied diffs. Explain possible frontend impact and what a frontend developer should check. Do not decide PASS/FAIL.

Changes:
${JSON.stringify(safeDiffs)}`,
  });

  return result.text;
}
