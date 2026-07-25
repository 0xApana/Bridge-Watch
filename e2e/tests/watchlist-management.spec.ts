import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("bridge-watch:onboarding:v1", "true");
    window.localStorage.setItem("bridge-watch:dashboard-tour:v1", JSON.stringify({ completed: true, lastStep: 0, seen: true }));
  });
});

test("creates a custom watchlist, adds assets, toggles active watchlist, and deletes watchlists", async ({ page }) => {
  // Go to watchlists manager page
  await page.goto("/watchlists");
  
  // Wait for the page to load
  await expect(page.locator("h1").filter({ hasText: "Watchlist Manager" })).toBeVisible();

  // Create custom watchlist
  const createInput = page.getByPlaceholder("New watchlist name...");
  await createInput.fill("My Custom Watchlist");
  await page.getByRole("button", { name: "Create" }).click();

  // Wait for the new watchlist to appear in the list
  await expect(page.getByText("My Custom Watchlist")).toBeVisible();
  
  // Navigate to an asset to add it to the watchlist
  await page.goto("/assets");
  
  // The active watchlist should be the new one by default, let's verify adding an asset
  const firstAssetWatchlistButton = page.locator('button[aria-label^="Add"]').first();
  await firstAssetWatchlistButton.click();
  
  // Go back to watchlists
  await page.goto("/watchlists");
  
  // Verify it's in the list or toggle active
  const watchlistRow = page.locator("div.border-stellar-border").filter({ hasText: "My Custom Watchlist" });
  await expect(watchlistRow).toBeVisible();
  
  // Click set active
  const setActiveBtn = watchlistRow.getByRole("button", { name: "Set Active" });
  if (await setActiveBtn.isVisible()) {
    await setActiveBtn.click();
  }
  
  // Verify it says "Active"
  await expect(watchlistRow.getByText("Active", { exact: true })).toBeVisible();

  // Delete the watchlist
  const deleteBtn = watchlistRow.getByRole("button", { name: "Delete" });
  await deleteBtn.click();
  
  // Verify it was deleted
  await expect(page.getByText("My Custom Watchlist")).not.toBeVisible();
});
