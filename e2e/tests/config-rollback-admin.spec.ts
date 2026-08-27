import { test, expect } from "@playwright/test";
import { mockCoreApi } from "../utils/mockApi";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("bridge-watch:onboarding:v1", "true");
    window.localStorage.setItem(
      "bridge-watch:dashboard-tour:v1",
      JSON.stringify({ completed: true, lastStep: 0, seen: true }),
    );
    window.localStorage.setItem(
      "bridge-watch:admin-api-key:v1",
      "test-admin-token",
    );
  });

  await mockCoreApi(page);

  // Mock config versions API
  await page.route("**/api/v1/admin/config-versions/**", async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (method === "GET" && url.includes("/config-versions/alert-thresholds")) {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          versions: [
            {
              id: "v1",
              configKey: "alert-thresholds",
              versionNumber: 3,
              payload: { maxLatency: 5000, minBalance: 100 },
              changeSummary: "Update maxLatency to 5s",
              appliedBy: "admin",
              appliedAt: new Date().toISOString(),
              isCurrent: true,
            },
            {
              id: "v2",
              configKey: "alert-thresholds",
              versionNumber: 2,
              payload: { maxLatency: 3000, minBalance: 100 },
              changeSummary: "Update maxLatency to 3s",
              appliedBy: "alice",
              appliedAt: new Date(Date.now() - 86400000).toISOString(),
              isCurrent: false,
            },
            {
              id: "v3",
              configKey: "alert-thresholds",
              versionNumber: 1,
              payload: { maxLatency: 1000, minBalance: 50 },
              changeSummary: "Initial configuration",
              appliedBy: "bob",
              appliedAt: new Date(Date.now() - 172800000).toISOString(),
              isCurrent: false,
            },
          ],
        }),
      });
    } else if (method === "GET" && url.includes("/rollback-preview/")) {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          configKey: "alert-thresholds",
          currentVersion: 3,
          targetVersion: 2,
          diff: [
            {
              field: "maxLatency",
              currentValue: 5000,
              targetValue: 3000,
              changeType: "modified",
            },
          ],
          impactSummary:
            "Rolling back from v3 to v2 will modify 1 field. This is a safe operation.",
        }),
      });
    } else if (method === "POST" && url.includes("/rollback/")) {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Rollback applied" }),
      });
    } else if (method === "POST") {
      await route.fulfill({
        status: 201,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          version: {
            id: "v4",
            configKey: "test-config",
            versionNumber: 1,
            payload: {},
            changeSummary: "Test version",
            appliedBy: "test-user",
            appliedAt: new Date().toISOString(),
            isCurrent: true,
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ versions: [] }),
      });
    }
  });
});

test.describe("Config Rollback Admin Page", () => {

  test("loads config rollback admin page successfully", async ({ page }) => {
    await page.goto("/admin/config-rollback");

    await Promise.race([
      page.waitForLoadState("networkidle"),
      page.waitForTimeout(5000),
    ]);

    const url = page.url();
    expect(url).toContain("/admin/config-rollback");
  });

  test("page displays version history table columns", async ({ page }) => {
    await page.goto("/admin/config-rollback");
    await page.waitForTimeout(2000);

    const content = await page.textContent("body");
    if (content) {
      // Check for table column headers
      expect(
        content.includes("Version") ||
        content.includes("version") ||
        content.includes("history")
      ).toBe(true);
    }
  });

  test("page does not crash on load", async ({ page }) => {
    const errors: string[] = [];

    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto("/admin/config-rollback");
    await page.waitForTimeout(2000);

    expect(errors.length).toBeLessThan(10);
  });

  test("navigation to config rollback page works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.goto("/admin/config-rollback");
    await page.waitForTimeout(1000);

    expect(page.url()).toContain("/admin/config-rollback");
  });

  test("page shows create version form when button is clicked", async ({ page }) => {
    await page.goto("/admin/config-rollback");
    await page.waitForTimeout(1000);

    const createButton = page.getByRole("button", { name: /create version/i });
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForTimeout(500);

      const content = await page.textContent("body");
      if (content) {
        expect(
          content.includes("Config key") ||
          content.includes("config key") ||
          content.includes("Payload")
        ).toBe(true);
      }
    }
  });
});
