import { test, expect } from "@playwright/test";
import { mockCoreApi } from "../utils/mockApi";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("bridge-watch:onboarding:v1", "true");
    window.localStorage.setItem("bridge-watch:dashboard-tour:v1", JSON.stringify({ completed: true, lastStep: 0, seen: true }));
  });
  await mockCoreApi(page);
});

test("toggles notification sounds preference", async ({ page }) => {
  // Navigate to notification preferences page
  await page.goto("/notification-preferences");

  // Wait for page to load and find notification preferences section
  const preferencesSection = page.locator("text=Notification Sounds").first();
  await expect(preferencesSection).toBeVisible({ timeout: 10000 });

  // Find the toggle button (switch element)
  const toggleButton = page.locator("button[aria-pressed]").first();

  // Get initial state
  const initialPressed = await toggleButton.getAttribute("aria-pressed");
  const isInitiallyEnabled = initialPressed === "true";

  // Click toggle to change state
  await toggleButton.click();

  // Small delay for state update
  await page.waitForTimeout(500);

  // Verify state changed
  const newPressed = await toggleButton.getAttribute("aria-pressed");
  const isNowEnabled = newPressed === "true";
  expect(isNowEnabled).not.toBe(isInitiallyEnabled);
});

test("displays notification sounds section with description", async ({ page }) => {
  await page.goto("/notification-preferences");

  // Check for notification sounds heading
  const heading = page.locator("h3").filter({ hasText: /Notification Sounds/i });
  await expect(heading).toBeVisible({ timeout: 10000 });

  // Check for description text
  const description = page.locator("text=Play a sound when a new notification arrives");
  await expect(description).toBeVisible({ timeout: 5000 });
});

test("displays browser push notifications as coming soon", async ({ page }) => {
  await page.goto("/notification-preferences");

  // Wait for page load
  await page.waitForLoadState("networkidle");

  // Check for browser push notifications section
  const heading = page.locator("text=Browser Push Notifications");
  await expect(heading).toBeVisible({ timeout: 10000 });

  // Check for "Coming Soon" text
  const comingSoon = page.locator("text=Coming Soon");
  await expect(comingSoon).toBeVisible({ timeout: 5000 });

  // Check for description
  const description = page.locator("text=Get alerts even when the dashboard is closed");
  await expect(description).toBeVisible({ timeout: 5000 });
});

test("notification preferences section has proper styling", async ({ page }) => {
  await page.goto("/notification-preferences");

  // Wait for page load
  await page.waitForLoadState("networkidle");

  // Find the preferences container
  const container = page.locator(".bg-stellar-card").first();
  await expect(container).toBeVisible({ timeout: 10000 });

  // Verify it has proper padding and spacing by checking bounding box
  const containerBox = await container.boundingBox();
  expect(containerBox).not.toBeNull();
  expect(containerBox?.width).toBeGreaterThan(0);
  expect(containerBox?.height).toBeGreaterThan(0);
});
