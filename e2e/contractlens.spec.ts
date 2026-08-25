import { test, expect } from "@playwright/test";

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
