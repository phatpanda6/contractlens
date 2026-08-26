import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("loads the ContractLens dashboard", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "API response drift check",
      level: 1,
    }),
  ).toBeVisible();
});

test("requires endpoint changes to be saved before running a check", async ({
  page,
}) => {
  await page.goto("/");

  const urlInput = page.getByLabel("Endpoint URL");
  const currentUrl = await urlInput.inputValue();

  await urlInput.fill(`${currentUrl} `);

  await expect(urlInput).toHaveValue(`${currentUrl} `);

  const runButton = page.getByRole("button", {
    name: "Run check",
  });

  await expect(runButton).toBeDisabled();

  const unsavedMessage = page.getByText(
    "Save your changes before running a check.",
  );

  await expect(unsavedMessage).toBeVisible();

  await page.getByRole("button", { name: "Save endpoint" }).click();

  await expect(urlInput).toHaveValue(currentUrl);
  await expect(runButton).toBeEnabled();

  await expect(unsavedMessage).toBeHidden();
});

test("shows a failing check for the breaking v2 response", async ({ page }) => {
  await page.goto("/");

  const urlInput = page.getByLabel("Endpoint URL");
  const saveButton = page.getByRole("button", {
    name: "Save endpoint",
  });
  const runButton = page.getByRole("button", {
    name: "Run check",
  });

  await urlInput.fill("/api/demo/products/v1 ");
  await saveButton.click();

  await expect(urlInput).toHaveValue("/api/demo/products/v1");
  await expect(runButton).toBeEnabled();

  const statusCard = page.getByText("Status", { exact: true }).locator("..");
  const changesCard = page
    .getByText("Changes Found", { exact: true })
    .locator("..");

  const detectedChangesSection = page
    .getByRole("heading", {
      name: "Detected changes",
      exact: true,
    })
    .locator("..");

  const recentChecksSection = page
    .getByRole("heading", {
      name: "Recent checks",
      exact: true,
    })
    .locator("..");

  await runButton.click();

  await expect(statusCard.getByText("Pass", { exact: true })).toBeVisible();

  await urlInput.fill("/api/demo/products/v2 ");
  await saveButton.click();

  await expect(urlInput).toHaveValue("/api/demo/products/v2");
  await expect(runButton).toBeEnabled();

  await runButton.click();

  await expect(statusCard.getByText("Fail", { exact: true })).toBeVisible();

  await expect(changesCard.getByText("3", { exact: true })).toBeVisible();

  await expect(
    detectedChangesSection.getByText("`title` is missing", {
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    detectedChangesSection.getByText("`price` changed from number to string", {
      exact: true,
    }),
  ).toBeVisible();

  await expect(
    detectedChangesSection.getByText("`name` was added", {
      exact: true,
    }),
  ).toBeVisible();

  await page.reload();

  await expect(statusCard.getByText("Fail", { exact: true })).toBeVisible();

  await expect(changesCard.getByText("3", { exact: true })).toBeVisible();

  const latestCheck = recentChecksSection.getByRole("listitem").first();

  await expect(latestCheck.getByText("Fail", { exact: true })).toBeVisible();
});
