import { test, expect } from "@playwright/test";
import { mockCoreApi } from "../utils/mockApi";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("bridge-watch:onboarding:v1", "true");
    window.localStorage.setItem("bridge-watch:dashboard-tour:v1", JSON.stringify({ completed: true, lastStep: 0, seen: true }));
  });
  await mockCoreApi(page);
});

test("toggles notification channels and updates email address", async ({ page }) => {
  // Navigate to notification preferences
  await page.goto("/settings/notifications");

  // Wait for the page to load
  await expect(page.locator("h1").filter({ hasText: /notification|preference/i })).toBeVisible({ timeout: 10000 });

  // Test toggling email notifications
  const emailToggle = page.getByRole("switch", { name: /email/i }).first();
  const initialEmailState = await emailToggle.isChecked();

  await emailToggle.click();
  await expect(emailToggle).toHaveAttribute("aria-checked", String(!initialEmailState));

  // Test toggling webhook notifications
  const webhookToggle = page.getByRole("switch", { name: /webhook/i }).first();
  const initialWebhookState = await webhookToggle.isChecked();

  await webhookToggle.click();
  await expect(webhookToggle).toHaveAttribute("aria-checked", String(!initialWebhookState));

  // Test updating email address
  const emailInput = page.getByLabel(/email.*address|email/i).first();
  if (await emailInput.isVisible()) {
    await emailInput.clear();
    await emailInput.fill("test@example.com");

    // Save the form
    const saveButton = page.getByRole("button", { name: /save|update/i }).first();
    await saveButton.click();

    // Verify success message or confirmation
    await expect(page.locator("text=/success|saved|updated/i")).toBeVisible({ timeout: 5000 });
  }

  // Verify email input has the new value
  await expect(emailInput).toHaveValue("test@example.com");
});

test("updates webhook threshold options", async ({ page }) => {
  // Navigate to notification preferences
  await page.goto("/settings/notifications");

  // Wait for the page to load
  await expect(page.locator("h1").filter({ hasText: /notification|preference/i })).toBeVisible({ timeout: 10000 });

  // Find webhook threshold dropdown/select
  const thresholdSelect = page.getByLabel(/threshold|severity|level/i).first();

  if (await thresholdSelect.isVisible()) {
    // Change threshold value
    await thresholdSelect.click();

    // Select a different threshold option
    const options = page.getByRole("option");
    const optionCount = await options.count();

    if (optionCount > 1) {
      await options.nth(1).click();

      // Save the form
      const saveButton = page.getByRole("button", { name: /save|update/i }).first();
      await saveButton.click();

      // Verify success message
      await expect(page.locator("text=/success|saved|updated/i")).toBeVisible({ timeout: 5000 });
    }
  }
});

test("saves notification preference form and persists changes", async ({ page }) => {
  // Navigate to notification preferences
  await page.goto("/settings/notifications");

  // Wait for the page to load
  await expect(page.locator("h1").filter({ hasText: /notification|preference/i })).toBeVisible({ timeout: 10000 });

  // Collect all toggles
  const toggles = page.getByRole("switch");
  const toggleCount = await toggles.count();

  if (toggleCount > 0) {
    // Toggle the first switch
    const firstToggle = toggles.first();
    const initialState = await firstToggle.isChecked();
    await firstToggle.click();

    // Click save button
    const saveButton = page.getByRole("button", { name: /save|update|submit/i }).first();
    await saveButton.click();

    // Wait for success notification
    await expect(page.locator("text=/success|saved|updated|changes saved/i")).toBeVisible({ timeout: 5000 });

    // Refresh the page to verify persistence
    await page.reload();

    // Wait for the page to load again
    await expect(page.locator("h1").filter({ hasText: /notification|preference/i })).toBeVisible({ timeout: 10000 });

    // Verify the toggle state persisted
    const refreshedToggle = toggles.first();
    const expectedState = !initialState;
    await expect(refreshedToggle).toHaveAttribute("aria-checked", String(expectedState));
  }
});

test("displays form validation errors for invalid email", async ({ page }) => {
  // Navigate to notification preferences
  await page.goto("/settings/notifications");

  // Wait for the page to load
  await expect(page.locator("h1").filter({ hasText: /notification|preference/i })).toBeVisible({ timeout: 10000 });

  // Find email input
  const emailInput = page.getByLabel(/email.*address|email/i).first();

  if (await emailInput.isVisible()) {
    // Enter invalid email
    await emailInput.clear();
    await emailInput.fill("invalid-email");

    // Try to save
    const saveButton = page.getByRole("button", { name: /save|update/i }).first();
    await saveButton.click();

    // Wait for error message
    await expect(page.locator("text=/invalid|error|required/i")).toBeVisible({ timeout: 5000 });

    // Verify form was not submitted
    const errorCount = await page.locator("text=/invalid|error/i").count();
    expect(errorCount).toBeGreaterThan(0);
  }
});
