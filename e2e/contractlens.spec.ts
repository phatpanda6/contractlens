import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("loads the ContractLens dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Catch breaking API changes.",
      level: 1,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Endpoint URL")).toBeHidden();
  await expect(
    page.getByRole("region", { name: "Saved baseline response", exact: true }),
  ).toBeVisible();
});

test("requires endpoint changes to be saved before running a check", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Edit endpoint" }).click();
  const urlInput = page.getByLabel("Endpoint URL");
  const currentUrl = await urlInput.inputValue();
  await urlInput.fill(`${currentUrl} `);
  const runButton = page.getByRole("button", {
    name: "Run check",
    exact: true,
  });
  await expect(runButton).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Changed response v2" }),
  ).toBeDisabled();
  const unsavedMessage = page.getByText(
    "Save your changes before running a check.",
  );
  await expect(unsavedMessage).toBeVisible();
  await page.getByRole("button", { name: "Save endpoint" }).click();
  await expect(urlInput).toHaveValue(currentUrl);
  await expect(runButton).toBeEnabled();
  await expect(unsavedMessage).toBeHidden();
});

test("keeps recorded targets truthful through edits, reload, baseline acceptance and a passing rerun", async ({
  page,
}) => {
  await page.goto("/");
  const runButton = page.getByRole("button", {
    name: "Run check",
    exact: true,
  });
  const result = page.locator(".comparison-card");
  const changes = page.getByRole("region", {
    name: "Detected changes",
    exact: true,
  });
  const history = page
    .getByRole("region", { name: "Recent checks", exact: true })
    .getByRole("listitem");
  const warning = result
    .getByRole("status")
    .filter({ hasText: "This result was recorded for" });

  await runButton.click();
  await expect(result.getByText("Pass", { exact: true })).toBeVisible();
  await expect(result.locator(".result-metadata")).toContainText(
    "/api/demo/products/v1",
  );

  const baselineSource = page
    .getByRole("region", { name: "Saved baseline response", exact: true })
    .locator(".json-source");
  const latestSource = page
    .getByRole("region", { name: "Latest checked response", exact: true })
    .locator(".json-source");
  await expect(baselineSource).toHaveText("Captured from /api/demo/products/v1");

  await page.getByRole("button", { name: "Changed response v2" }).click();
  await expect(runButton).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Changed response v2" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(baselineSource).toHaveText("Captured from /api/demo/products/v1");
  await expect(latestSource).toHaveText("Checked /api/demo/products/v1");
  await expect(warning).toContainText(
    "This result was recorded for /api/demo/products/v1. The current target is /api/demo/products/v2.",
  );
  await expect(result.getByText("Pass", { exact: true })).toBeVisible();

  await page.reload();
  await expect(warning).toBeVisible();
  await runButton.click();
  await expect(result.getByText("Fail", { exact: true })).toBeVisible();
  await expect(warning).toBeHidden();
  await expect(baselineSource).toHaveText("Captured from /api/demo/products/v1");
  await expect(latestSource).toHaveText("Checked /api/demo/products/v2");
  await expect(result.locator(".result-metadata")).toContainText(
    "/api/demo/products/v2",
  );
  await expect(
    changes.getByText("3 changes found", { exact: true }),
  ).toBeVisible();
  await expect(
    changes.getByRole("row", { name: /title.*Missing.*Breaking/ }),
  ).toBeVisible();
  await expect(
    changes.getByRole("row", { name: /price.*number.*string.*Breaking/ }),
  ).toBeVisible();
  await expect(
    changes.getByRole("row", { name: /name.*Absent.*Added.*Informational/ }),
  ).toBeVisible();

  await page.reload();
  await expect(result.getByText("Fail", { exact: true })).toBeVisible();
  await expect(history.nth(0).getByText("Fail", { exact: true })).toBeVisible();

  await expect(baselineSource).toHaveText("Captured from /api/demo/products/v1");
  await expect(latestSource).toHaveText("Checked /api/demo/products/v2");

  // A stale result must not be accepted while looking at a different target.
  await page.getByRole("button", { name: "Original response v1" }).click();
  await expect(warning).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Accept as new baseline" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Changed response v2" }).click();
  await expect(warning).toBeHidden();
  await page.getByRole("button", { name: "Accept as new baseline" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Baseline updated. Run another check to verify it." }),
  ).toBeVisible();
  await expect(result.getByText("Fail", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Saved baseline response", exact: true }),
  ).toContainText('"name"');

  await expect(baselineSource).toHaveText("Captured from /api/demo/products/v2");
  await page.reload();
  await expect(baselineSource).toHaveText("Captured from /api/demo/products/v2");
  await runButton.click();
  await expect(result.getByText("Pass", { exact: true })).toBeVisible();
  await expect(
    changes.getByText("0 changes found", { exact: true }),
  ).toBeVisible();
  await expect(
    changes.getByText("No schema changes detected.", { exact: true }),
  ).toBeVisible();
  await expect(history.nth(0).getByText("Pass", { exact: true })).toBeVisible();
  await expect(history.nth(1).getByText("Fail", { exact: true })).toBeVisible();
});

test("shows the server validation message when endpoint save is rejected", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Edit endpoint" }).click();
  const urlInput = page.getByLabel("Endpoint URL");
  const originalUrl = await urlInput.inputValue();
  await urlInput.fill("http://example.com");
  await page.getByRole("button", { name: "Save endpoint" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "External endpoint URL must use HTTPS",
  );
  await expect(
    page.getByRole("button", { name: "Run check", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await page.getByRole("button", { name: "Edit endpoint" }).click();
  await expect(urlInput).toHaveValue(originalUrl);
});

test("coordinates controls during a slow check and recovers from a failed request", async ({
  page,
}) => {
  await page.goto("/");
  let releaseRequest!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  await page.route("**/api/endpoints/*/run", async (route) => {
    await gate;
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: '{"error":"Controlled failure"}',
    });
  });
  await page.getByRole("button", { name: "Run check", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Running…", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Edit endpoint" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Original response v1" }),
  ).toBeDisabled();
  releaseRequest();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "The endpoint check could not be completed. Please try again.",
  );
  await expect(
    page.getByRole("button", { name: "Run check", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Edit endpoint" }),
  ).toBeEnabled();
});

test("supports keyboard evidence switching and narrow screens without page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const response = page.getByRole("radio", { name: "Response", exact: true });
  const schema = page.getByRole("radio", { name: "Schema", exact: true });
  await response.focus();
  await page.keyboard.press("ArrowRight");
  await expect(schema).toBeChecked();
  await expect(
    page.getByRole("region", { name: "Saved baseline schema", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Saved baseline response", exact: true }),
  ).toBeHidden();
  await page.keyboard.press("ArrowLeft");
  await expect(response).toBeChecked();
  const baseline = page.getByRole("region", {
    name: "Saved baseline response",
    exact: true,
  });
  const latest = page.getByRole("region", {
    name: "Latest checked response",
    exact: true,
  });
  const baselineBox = await baseline.boundingBox();
  const latestBox = await latest.boundingBox();
  expect(latestBox!.y).toBeGreaterThan(baselineBox!.y + baselineBox!.height);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
