import { expect, test } from "@playwright/test";

test("operator can load operational controls", async ({ page }) => {
  await page.route("**/api/v1/operations/changes**", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ changes: [] }) }));
  await page.route("**/api/v1/admin/error-catalog", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ entries: [] }) }));
  await page.route("**/api/v1/admin/request-sampling**", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ policies: [] }) }));
  await page.goto("/settings");
  const controls = page.locator('section[aria-labelledby="operational-controls-heading"]');
  await controls.getByLabel("Admin API key").fill("test-admin-key");
  await controls.getByRole("button", { name: "Load controls" }).click();
  await expect(page.getByText("No changes for this environment.")).toBeVisible();
});
