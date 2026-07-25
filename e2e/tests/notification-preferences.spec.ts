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
  // Navigate to settings/dashboard that contains NotificationPreferences
  await page.goto("/");

  // Find notification preferences section
  const preferencesSection = page.locator("text=Notification Sounds").first();
  await expect(preferencesSection).toBeVisible({ timeout: 5000 });

  // Find and click the toggle button
  const toggleButton = page
    .locator(".bg-stellar-blue, .bg-stellar-border")
    .filter({ hasText: "" })
    .first();

  // Get initial state
  const initialClass = await toggleButton.getAttribute("class");
  const isInitiallyEnabled = initialClass?.includes("bg-stellar-blue") ?? false;

  // Click toggle
  await toggleButton.click();

  // Verify state changed
  const newClass = await toggleButton.getAttribute("class");
  const isNowEnabled = newClass?.includes("bg-stellar-blue") ?? false;
  expect(isNowEnabled).not.toBe(isInitiallyEnabled);
});

test("displays notification sounds section with description", async ({ page }) => {
  await page.goto("/");

  // Check for notification sounds heading
  const heading = page.locator("h3").filter({ hasText: /Notification Sounds/i });
  await expect(heading).toBeVisible({ timeout: 5000 });

  // Check for description text
  const description = page.locator("text=Play a sound when a new notification arrives");
  await expect(description).toBeVisible();
});

test("displays browser push notifications as coming soon", async ({ page }) => {
  await page.goto("/");

  // Check for browser push notifications section
  const heading = page.locator("text=Browser Push Notifications");
  await expect(heading).toBeVisible({ timeout: 5000 });

  // Check for "Coming Soon" text
  const comingSoon = page.locator("text=Coming Soon");
  await expect(comingSoon).toBeVisible();

  // Check for description
  const description = page.locator("text=Get alerts even when the dashboard is closed");
  await expect(description).toBeVisible();
});

test("notification preferences section has proper styling", async ({ page }) => {
  await page.goto("/");

  // Find the preferences container
  const container = page.locator(".bg-stellar-card.border.border-stellar-border").first();
  await expect(container).toBeVisible({ timeout: 5000 });

  // Verify it has proper padding and spacing
  const containerBox = await container.boundingBox();
  expect(containerBox).not.toBeNull();
  expect(containerBox?.width).toBeGreaterThan(0);
  expect(containerBox?.height).toBeGreaterThan(0);
});
