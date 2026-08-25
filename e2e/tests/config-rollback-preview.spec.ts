import { expect, test } from "@playwright/test";
import { mockCoreApi } from "../utils/mockApi";

test("operator can preview a config rollback without applying it", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("bridge-watch:onboarding:v1", "true");
    window.localStorage.setItem(
      "bridge-watch:dashboard-tour:v1",
      JSON.stringify({ completed: true, lastStep: 0, seen: true })
    );
  });

  await mockCoreApi(page);

  await page.route("**/api/v1/admin/configs/staging/RATE_LIMIT_MAX/rollback-preview", async (route) => {
    expect(route.request().method()).toBe("POST");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        preview: {
          environment: "staging",
          key: "RATE_LIMIT_MAX",
          currentRevision: 3,
          targetRevision: 1,
          changed: true,
          sensitive: false,
          currentValue: 250,
          targetValue: 100,
          targetCreatedAt: "2026-01-01T00:00:00.000Z",
          targetCreatedBy: "ops",
          targetChangeReason: "baseline",
          validation: { valid: true },
        },
      }),
    });
  });

  await page.goto("/settings");
  await page.getByLabel("Config key").fill("RATE_LIMIT_MAX");
  await page.getByLabel("Admin API key").fill("test-admin-key");
  await page.getByRole("button", { name: "Generate preview" }).click();

  await expect(page.getByText("Revision 3 to 1")).toBeVisible();
  await expect(page.getByText("Valid rollback target")).toBeVisible();
});
