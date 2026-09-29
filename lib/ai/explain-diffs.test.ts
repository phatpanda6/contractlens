import { afterEach, expect, it, vi } from "vitest";
import { explainDiffs } from "./explain-diffs";

const generateTextMock = vi.hoisted(() => vi.fn());

vi.mock("ai", () => ({
  generateText: generateTextMock,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  generateTextMock.mockReset();
});

it("rejects missing Gateway credentials before calling the model", async () => {
  const diffs = [
    {
      type: "TYPE_CHANGED",
      path: "price",
      from: "number",
      to: "string",
      severity: "breaking",
    },
  ];

  vi.stubEnv("AI_GATEWAY_API_KEY", "  ");

  await expect(explainDiffs(diffs)).rejects.toThrow(
    "Gateway API key is not configured",
  );
  expect(generateTextMock).not.toHaveBeenCalled();
});

it("returns an explanation from the model for stored diffs", async () => {
  const diffs = [
    {
      type: "TYPE_CHANGED",
      path: "price",
      from: "number",
      to: "string",
      severity: "breaking",
    },
  ];

  vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");

  const explanation = "Changing price to a string may break calculations.";

  generateTextMock.mockResolvedValue({ text: explanation });

  const result = await explainDiffs(diffs);

  expect(result).toEqual(explanation);
  expect(generateTextMock).toHaveBeenCalledOnce();

  const options = generateTextMock.mock.calls[0][0];

  expect(options.prompt).toContain("price");
  expect(options.prompt).toContain("TYPE_CHANGED");
});

it("rejects invalid stored diffs before calling the model", async () => {
  vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");

  const invalidDiffs = {
    responseBody: { secret: "example" },
  };

  generateTextMock.mockResolvedValue({ text: "should not be used" });

  await expect(explainDiffs(invalidDiffs)).rejects.toThrow(
    "Invalid stored diffs",
  );

  expect(generateTextMock).not.toHaveBeenCalled();
});

it("rejects malformed diff items before calling the model", async () => {
  vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");

  const invalidDiffs = [{ responseBody: { secret: "example" } }];

  generateTextMock.mockResolvedValue({ text: "should not be used" });

  await expect(explainDiffs(invalidDiffs)).rejects.toThrow(
    "Invalid stored diffs",
  );

  expect(generateTextMock).not.toHaveBeenCalled();
});

it("sends only diff fields to the model", async () => {
  vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");

  const diffsWithExtraData = [
    {
      type: "TYPE_CHANGED",
      path: "price",
      severity: "breaking",
      from: "number",
      to: "string",
      responseBody: { secret: "example" },
    },
  ];

  const explanation = "Changing price to a string may break calculations";

  generateTextMock.mockResolvedValue({ text: explanation });

  await explainDiffs(diffsWithExtraData);

  expect(generateTextMock).toHaveBeenCalledOnce();

  const options = generateTextMock.mock.calls[0][0];
  expect(options.prompt).toContain("price");
  expect(options.prompt).not.toContain("secret");
});

it("rejects an unknown diff type before calling the model", async () => {
  vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");

  const diffsWithUnknownType = [
    {
      type: "UNKNOWN_CHANGE",
      path: "price",
      severity: "breaking",
      from: "number",
      to: "string",
    },
  ];

  generateTextMock.mockResolvedValue({ text: "should not be used" });

  await expect(explainDiffs(diffsWithUnknownType)).rejects.toThrow(
    "Invalid stored diffs",
  );

  expect(generateTextMock).not.toHaveBeenCalled();
});

it("rejects an unknown diff severity before calling the model", async () => {
  vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");

  const diffsWithUnknownSeverity = [
    {
      type: "TYPE_CHANGED",
      path: "price",
      severity: "urgent",
      from: "number",
      to: "string",
    },
  ];

  generateTextMock.mockResolvedValue({ text: "should not be used" });

  await expect(explainDiffs(diffsWithUnknownSeverity)).rejects.toThrow(
    "Invalid stored diffs",
  );

  expect(generateTextMock).not.toHaveBeenCalled();
});

it("rejects a type change missing to before calling the model", async () => {
  vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");

  const diffsWithoutTo = [
    {
      type: "TYPE_CHANGED",
      path: "price",
      severity: "breaking",
      from: "number",
    },
  ];

  generateTextMock.mockResolvedValue({ text: "should not be used" });

  await expect(explainDiffs(diffsWithoutTo)).rejects.toThrow(
    "Invalid stored diffs",
  );

  expect(generateTextMock).not.toHaveBeenCalled();
});

it("rejects a type change missing from before calling the model", async () => {
  vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");

  const diffsWithoutFrom = [
    {
      type: "TYPE_CHANGED",
      path: "price",
      severity: "breaking",
      to: "string",
    },
  ];

  generateTextMock.mockResolvedValue({ text: "should not be used" });

  await expect(explainDiffs(diffsWithoutFrom)).rejects.toThrow(
    "Invalid stored diffs",
  );

  expect(generateTextMock).not.toHaveBeenCalled();
});

it("instructs the model to explain impact without deciding status", async () => {
  vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");

  const diffs = [
    {
      type: "TYPE_CHANGED",
      path: "price",
      from: "number",
      to: "string",
      severity: "breaking",
    },
  ];

  const explanation = "Changing price to a string may break calculations.";

  generateTextMock.mockResolvedValue({ text: explanation });


  await explainDiffs(diffs);

  expect(generateTextMock).toHaveBeenCalledOnce();

  const options = generateTextMock.mock.calls[0][0];

  expect(options.prompt).toContain("Use only the supplied diffs");
  expect(options.prompt).toContain("what a frontend developer should check");
  expect(options.prompt).toContain("Do not decide PASS/FAIL");
});
