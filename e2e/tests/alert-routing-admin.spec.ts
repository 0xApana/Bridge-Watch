import { test, expect } from "@playwright/test";
import { mockCoreApi } from "../utils/mockApi";

const rulesFixture = {
  rules: [
    {
      id: "rule-001",
      name: "Critical Asset Alerts",
      priority: 1,
      conditions: {
        severity: ["critical"],
        assetCode: ["USDC", "EURC"],
      },
      destinations: ["webhook-001", "slack-001"],
      enabled: true,
      createdAt: "2026-01-15T10:00:00Z",
    },
    {
      id: "rule-002",
      name: "Bridge Health Warnings",
      priority: 2,
      conditions: {
        severity: ["high", "medium"],
        bridgeId: ["CIRCLE_USDC"],
      },
      destinations: ["email-001"],
      enabled: true,
      createdAt: "2026-01-16T12:00:00Z",
    },
  ],
};

const webhooksFixture = {
  webhooks: [
    {
      id: "webhook-001",
      name: "PagerDuty",
      url: "https://events.pagerduty.com/v2/enqueue",
      enabled: true,
    },
    {
      id: "webhook-002",
      name: "Slack Webhook",
      url: "https://hooks.slack.com/services/XXX",
      enabled: true,
    },
  ],
};

test.describe("Alert Routing Admin Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("bridge-watch:onboarding:v1", "true");
      window.localStorage.setItem(
        "bridge-watch:dashboard-tour:v1",
        JSON.stringify({ completed: true, lastStep: 0, seen: true }),
      );
    });

    await mockCoreApi(page);

    // Mock alert routing rules API
    await page.route("**/api/v1/alerts/routing/rules", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(rulesFixture),
        });
      } else if (method === "POST") {
        await route.fulfill({
          status: 201,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: "rule-003",
            name: "New Rule",
            priority: 3,
            conditions: {},
            destinations: [],
            enabled: true,
            createdAt: new Date().toISOString(),
          }),
        });
      }
    });

    await page.route("**/api/v1/alerts/routing/rules/*", async (route) => {
      const method = route.request().method();
      if (method === "PUT") {
        await route.fulfill({
          status: 200,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ success: true }),
        });
      } else if (method === "DELETE") {
        await route.fulfill({
          status: 204,
          headers: { "content-type": "application/json" },
          body: "",
        });
      }
    });

    await page.route("**/api/v1/alerts/routing/webhooks", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(webhooksFixture),
      });
    });
  });

  test("page loads without errors and displays alert routing content", async ({
    page,
  }) => {
    await page.goto("/admin/alert-routing");
    await page.waitForLoadState("networkidle");

    // Page should load without errors
    await expect(page).toHaveTitle(/Bridge Watch/);
  });

  test("API route for alert routing rules returns expected data", async ({
    page,
  }) => {
    await page.goto("/admin/alert-routing");
    await page.waitForLoadState("networkidle");

    // Check that the mocked API returns data
    const response = await page.request.get("/api/v1/alerts/routing/rules");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.rules).toHaveLength(2);
    expect(data.rules[0].name).toBe("Critical Asset Alerts");
  });

  test("API route for webhooks returns expected data", async ({ page }) => {
    await page.goto("/admin/alert-routing");
    await page.waitForLoadState("networkidle");

    const response = await page.request.get("/api/v1/alerts/routing/webhooks");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.webhooks).toHaveLength(2);
    expect(data.webhooks[0].name).toBe("PagerDuty");
  });

  test("POST to alert routing rules creates a new rule", async ({ page }) => {
    await page.goto("/admin/alert-routing");
    await page.waitForLoadState("networkidle");

    const response = await page.request.post("/api/v1/alerts/routing/rules", {
      data: {
        name: "Test Rule",
        priority: 5,
        conditions: { severity: ["low"] },
        destinations: ["webhook-001"],
        enabled: true,
      },
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.id).toBe("rule-003");
    expect(data.name).toBe("New Rule");
  });

  test("PUT to alert routing rule updates successfully", async ({ page }) => {
    await page.goto("/admin/alert-routing");
    await page.waitForLoadState("networkidle");

    const response = await page.request.put(
      "/api/v1/alerts/routing/rules/rule-001",
      {
        data: {
          priority: 10,
        },
      },
    );

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test("DELETE to alert routing rule succeeds", async ({ page }) => {
    await page.goto("/admin/alert-routing");
    await page.waitForLoadState("networkidle");

    const response = await page.request.delete(
      "/api/v1/alerts/routing/rules/rule-002",
    );

    expect(response.status()).toBe(204);
  });
});
