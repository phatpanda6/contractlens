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
    prompt: `Use only the supplied diffs. In plain text, write at most 100 words for a frontend developer.

Use this format with each item on its own line:
Summary: One sentence about the possible frontend impact.
Check: One specific thing a frontend developer should check.
Check: Another specific thing to check, if useful.
Check: A third specific thing to check, if useful.

Focus on what a frontend developer should check. Use short sentences. Do not use Markdown headings, bold text, or bullet symbols.

Describe possibilities, not confirmed bugs. Do not assume an added field replaces a removed field. Do not decide PASS/FAIL or assign a risk level.

State observed changes directly: a missing field is missing in this recorded response. Use words like “may” only for possible frontend effects. Do not infer that an added field replaces a missing field.

In the summary, name the detected field changes directly. Only use uncertain language for their possible frontend effects. Avoid guessing the API’s business domain from field names.
Diffs:
${JSON.stringify(safeDiffs)}`,
  });

  return result.text;
}
