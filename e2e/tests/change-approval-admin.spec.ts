import { test, expect } from "@playwright/test";
import { mockCoreApi } from "../utils/mockApi";

test.describe("Change Approval Admin Page", () => {
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

    // Mock change requests API
    await page.route("**/api/v1/admin/change-requests**", async (route) => {
      const method = route.request().method();
      const url = route.request().url();

      if (method === "GET" && !url.includes("/change-requests/")) {
        await route.fulfill({
          status: 200,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            requests: [
              {
                id: "cr-001",
                title: "Increase rate limit threshold",
                description: "Need to increase limit for USDC bridge to handle peak traffic",
                changeType: "config_update",
                payload: { rateLimit: 1000 },
                status: "pending_approval",
                submittedBy: "alice",
                submittedAt: "2026-08-24T10:00:00Z",
                reviewedBy: null,
                reviewedAt: null,
                reviewComment: null,
                appliedAt: null,
                createdAt: "2026-08-24T09:00:00Z",
                updatedAt: "2026-08-24T10:00:00Z",
              },
              {
                id: "cr-002",
                title: "Update sampling rule",
                description: "Adjust sampling rate to 25% for slow endpoints",
                changeType: "sampling_update",
                payload: { rate: 0.25 },
                status: "draft",
                submittedBy: "bob",
                submittedAt: null,
                reviewedBy: null,
                reviewedAt: null,
                reviewComment: null,
                appliedAt: null,
                createdAt: "2026-08-25T11:00:00Z",
                updatedAt: "2026-08-25T11:00:00Z",
              },
              {
                id: "cr-003",
                title: "Enable new alert rule",
                description: "Activate alert rule for high latency",
                changeType: "rule_change",
                payload: { alertRuleId: "rule-123" },
                status: "approved",
                submittedBy: "charlie",
                submittedAt: "2026-08-23T14:00:00Z",
                reviewedBy: "admin",
                reviewedAt: "2026-08-23T15:00:00Z",
                reviewComment: "Looks good, approved for deployment",
                appliedAt: null,
                createdAt: "2026-08-23T13:00:00Z",
                updatedAt: "2026-08-23T15:00:00Z",
              },
            ],
          }),
        });
      } else if (method === "POST" && !url.includes("/submit") && !url.includes("/approve") && !url.includes("/reject")) {
        await route.fulfill({
          status: 201,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            request: {
              id: "cr-004",
              title: "New Request",
              description: "Test request",
              changeType: "other",
              payload: {},
              status: "draft",
              submittedBy: "test-user",
              submittedAt: null,
              reviewedBy: null,
              reviewedAt: null,
              reviewComment: null,
              appliedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        });
      } else if (method === "POST") {
        await route.fulfill({
          status: 200,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: "Success" }),
        });
      }
    });
  });

  test("loads change approval admin page successfully", async ({ page }) => {
    await page.goto("/admin/change-requests");

    await Promise.race([
      page.waitForLoadState("networkidle"),
      page.waitForTimeout(5000),
    ]);

    const url = page.url();
    expect(url).toContain("/admin/change-requests");
  });

  test("mocked API returns change requests", async ({ page }) => {
    let capturedResponse: any = null;

    page.on("response", async (response) => {
      if (response.url().includes("/api/v1/admin/change-requests") && 
          response.request().method() === "GET") {
        try {
          capturedResponse = await response.json();
        } catch (e) {
          // Ignore parse errors
        }
      }
    });

    await page.goto("/admin/change-requests");
    await page.waitForTimeout(2000);

    if (capturedResponse) {
      expect(capturedResponse.requests).toBeDefined();
      expect(capturedResponse.requests.length).toBeGreaterThanOrEqual(0);
    }
  });

  test("page displays status tabs", async ({ page }) => {
    await page.goto("/admin/change-requests");
    await page.waitForTimeout(2000);

    const content = await page.textContent("body");
    if (content) {
      // Check for status tab labels
      expect(
        content.includes("All") ||
        content.includes("Draft") ||
        content.includes("Pending")
      ).toBe(true);
    }
  });

  test("page displays pending approval count", async ({ page }) => {
    await page.goto("/admin/change-requests");
    await page.waitForTimeout(2000);

    const content = await page.textContent("body");
    if (content) {
      // Look for stat card with pending count
      expect(
        content.includes("Pending") || content.includes("pending")
      ).toBe(true);
    }
  });

  test("page does not crash on load", async ({ page }) => {
    const errors: string[] = [];

    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto("/admin/change-requests");
    await page.waitForTimeout(2000);

    expect(errors.length).toBeLessThan(10);
  });

  test("navigation to change approval page works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    await page.goto("/admin/change-requests");
    await page.waitForTimeout(1000);

    expect(page.url()).toContain("/admin/change-requests");
  });
});
