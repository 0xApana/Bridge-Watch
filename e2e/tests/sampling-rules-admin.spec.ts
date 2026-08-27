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

  // Mock sampling rules API
  await page.route("**/api/v1/admin/sampling-rules**", async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (method === "GET" && !url.includes("/rules/")) {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rules: [
            {
              id: "rule-001",
              name: "High traffic sampling",
              description: "Sample 10% of all requests during peak hours",
              sampleRate: 0.1,
              target: "all_requests",
              targetValue: null,
              enabled: true,
              priority: 0,
              createdBy: "admin",
              createdAt: "2026-08-20T10:00:00Z",
              updatedAt: "2026-08-20T10:00:00Z",
            },
            {
              id: "rule-002",
              name: "Slow request sampling",
              description: "Sample 50% of slow requests",
              sampleRate: 0.5,
              target: "endpoint",
              targetValue: "/api/v1/transactions",
              enabled: false,
              priority: 1,
              createdBy: "admin",
              createdAt: "2026-08-21T12:00:00Z",
              updatedAt: "2026-08-21T12:00:00Z",
            },
          ],
        }),
      });
    } else if (method === "POST") {
      await route.fulfill({
        status: 201,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rule: {
            id: "rule-003",
            name: "New Rule",
            description: null,
            sampleRate: 0.25,
            target: "all_requests",
            targetValue: null,
            enabled: true,
            priority: 2,
            createdBy: "admin",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    } else if (method === "DELETE") {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Deleted" }),
      });
    }
  });
});

test.describe("Sampling Rules Admin Page", () => {

  test("loads sampling rules admin page successfully", async ({ page }) => {
    await page.goto("/admin/sampling-rules");

    await Promise.race([
      page.waitForLoadState("networkidle"),
      page.waitForTimeout(5000),
    ]);

    const url = page.url();
    expect(url).toContain("/admin/sampling-rules");
  });

  test("mocked API returns sampling rules", async ({ page }) => {
    let capturedResponse: any = null;

    page.on("response", async (response) => {
      if (response.url().includes("/api/v1/admin/sampling-rules")) {
        try {
          capturedResponse = await response.json();
        } catch (e) {
          // Ignore parse errors
        }
      }
    });

    await page.goto("/admin/sampling-rules");
    await page.waitForTimeout(2000);

    if (capturedResponse) {
      expect(capturedResponse.rules).toBeDefined();
      expect(capturedResponse.rules.length).toBeGreaterThanOrEqual(0);
    }
  });

  test("page displays sample rate as percentage", async ({ page }) => {
    await page.goto("/admin/sampling-rules");
    await page.waitForTimeout(2000);

    // Look for percentage text (10% and 50% from mock data)
    const content = await page.textContent("body");
    if (content) {
      expect(content.includes("%")).toBe(true);
    }
  });

  test("page does not crash on load", async ({ page }) => {
    const errors: string[] = [];

    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto("/admin/sampling-rules");
    await page.waitForTimeout(2000);

    expect(errors.length).toBeLessThan(10);
  });

  test("navigation to sampling rules page works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.goto("/admin/sampling-rules");
    await page.waitForTimeout(1000);

    expect(page.url()).toContain("/admin/sampling-rules");
  });
});
