import { test, expect } from "@playwright/test";
import { mockApi } from "../utils/mockApi";

test.describe("Alert Routing Admin Page", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page, {
      "/api/v1/alerts/routing/rules": {
        GET: {
          status: 200,
          body: {
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
          },
        },
        POST: {
          status: 201,
          body: {
            id: "rule-003",
            name: "New Rule",
            priority: 3,
            conditions: {},
            destinations: [],
            enabled: true,
            createdAt: new Date().toISOString(),
          },
        },
      },
      "/api/v1/alerts/routing/rules/:id": {
        PUT: {
          status: 200,
          body: { success: true },
        },
        DELETE: {
          status: 204,
          body: null,
        },
      },
      "/api/v1/alerts/routing/webhooks": {
        GET: {
          status: 200,
          body: {
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
          },
        },
      },
    });

    await page.goto("/admin/alert-routing");
    await page.waitForLoadState("networkidle");
  });

  test("displays existing alert routing rules", async ({ page }) => {
    await expect(page.getByText("Critical Asset Alerts")).toBeVisible();
    await expect(page.getByText("Bridge Health Warnings")).toBeVisible();

    // Verify priority display
    const rule1 = page.locator('[data-testid="rule-rule-001"]');
    await expect(rule1.getByText("Priority: 1")).toBeVisible();

    const rule2 = page.locator('[data-testid="rule-rule-002"]');
    await expect(rule2.getByText("Priority: 2")).toBeVisible();
  });

  test("creates a new alert routing rule", async ({ page }) => {
    await page.getByRole("button", { name: /create rule/i }).click();

    // Fill in rule details
    await page.getByLabel(/rule name/i).fill("Low Priority Notifications");
    await page.getByLabel(/priority/i).fill("5");

    // Select conditions
    await page.getByLabel(/severity/i).selectOption(["low"]);
    await page.getByLabel(/asset code/i).fill("XLM");

    // Select destination
    await page.getByLabel(/webhook destination/i).selectOption(["webhook-002"]);

    // Submit form
    await page.getByRole("button", { name: /save rule/i }).click();

    // Verify success message
    await expect(page.getByText(/rule created successfully/i)).toBeVisible();
  });

  test("updates priority threshold for existing rule", async ({ page }) => {
    const rule1 = page.locator('[data-testid="rule-rule-001"]');

    // Click edit button
    await rule1.getByRole("button", { name: /edit/i }).click();

    // Update priority
    await page.getByLabel(/priority/i).clear();
    await page.getByLabel(/priority/i).fill("10");

    // Save changes
    await page.getByRole("button", { name: /save/i }).click();

    // Verify success
    await expect(page.getByText(/rule updated/i)).toBeVisible();
  });

  test("updates webhook destination configuration", async ({ page }) => {
    const rule2 = page.locator('[data-testid="rule-rule-002"]');

    await rule2.getByRole("button", { name: /edit/i }).click();

    // Change webhook destination
    await page.getByLabel(/webhook destination/i).selectOption(["webhook-001"]);

    // Add another destination
    await page.getByRole("button", { name: /add destination/i }).click();
    await page
      .locator('[data-testid="destination-select-1"]')
      .selectOption(["webhook-002"]);

    // Save changes
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByText(/rule updated/i)).toBeVisible();
  });

  test("toggles rule enabled state", async ({ page }) => {
    const rule1 = page.locator('[data-testid="rule-rule-001"]');

    // Rule should be enabled initially
    const toggle = rule1.getByRole("switch", { name: /enabled/i });
    await expect(toggle).toBeChecked();

    // Disable rule
    await toggle.click();

    // Verify state change
    await expect(toggle).not.toBeChecked();
    await expect(page.getByText(/rule disabled/i)).toBeVisible();
  });

  test("deletes an alert routing rule", async ({ page }) => {
    const rule2 = page.locator('[data-testid="rule-rule-002"]');

    // Click delete button
    await rule2.getByRole("button", { name: /delete/i }).click();

    // Confirm deletion in modal
    await page.getByRole("button", { name: /confirm delete/i }).click();

    // Verify rule is removed
    await expect(page.getByText("Bridge Health Warnings")).not.toBeVisible();
    await expect(page.getByText(/rule deleted/i)).toBeVisible();
  });

  test("validates required fields when creating rule", async ({ page }) => {
    await page.getByRole("button", { name: /create rule/i }).click();

    // Try to submit without filling required fields
    await page.getByRole("button", { name: /save rule/i }).click();

    // Verify validation errors
    await expect(page.getByText(/rule name is required/i)).toBeVisible();
    await expect(page.getByText(/priority is required/i)).toBeVisible();
  });

  test("reorders rules by dragging priority", async ({ page }) => {
    const rule1 = page.locator('[data-testid="rule-rule-001"]');
    const rule2 = page.locator('[data-testid="rule-rule-002"]');

    // Get initial positions
    const rule1Box = await rule1.boundingBox();
    const rule2Box = await rule2.boundingBox();

    if (!rule1Box || !rule2Box) {
      throw new Error("Could not get bounding boxes");
    }

    // Drag rule 2 above rule 1
    await page.mouse.move(
      rule2Box.x + rule2Box.width / 2,
      rule2Box.y + rule2Box.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(rule1Box.x + rule1Box.width / 2, rule1Box.y + 10);
    await page.mouse.up();

    // Verify reordering success message
    await expect(page.getByText(/rules reordered/i)).toBeVisible();
  });

  test("filters rules by status", async ({ page }) => {
    // Click filter dropdown
    await page.getByRole("button", { name: /filter/i }).click();

    // Select "Disabled only"
    await page.getByRole("menuitem", { name: /disabled only/i }).click();

    // Both rules should be hidden (they're both enabled)
    await expect(page.getByText("Critical Asset Alerts")).not.toBeVisible();
    await expect(page.getByText("Bridge Health Warnings")).not.toBeVisible();

    // Reset filter
    await page.getByRole("button", { name: /filter/i }).click();
    await page.getByRole("menuitem", { name: /all rules/i }).click();

    // Rules should be visible again
    await expect(page.getByText("Critical Asset Alerts")).toBeVisible();
  });

  test("searches rules by name", async ({ page }) => {
    // Type in search box
    await page.getByPlaceholder(/search rules/i).fill("Bridge");

    // Only matching rule should be visible
    await expect(page.getByText("Bridge Health Warnings")).toBeVisible();
    await expect(page.getByText("Critical Asset Alerts")).not.toBeVisible();

    // Clear search
    await page.getByPlaceholder(/search rules/i).clear();

    // All rules visible again
    await expect(page.getByText("Critical Asset Alerts")).toBeVisible();
  });

  test("displays webhook destinations list", async ({ page }) => {
    // Navigate to webhooks tab
    await page.getByRole("tab", { name: /webhooks/i }).click();

    // Verify webhooks are displayed
    await expect(page.getByText("PagerDuty")).toBeVisible();
    await expect(page.getByText("Slack Webhook")).toBeVisible();
  });

  test("shows rule condition details when expanded", async ({ page }) => {
    const rule1 = page.locator('[data-testid="rule-rule-001"]');

    // Click to expand
    await rule1.getByRole("button", { name: /expand/i }).click();

    // Verify condition details are visible
    await expect(page.getByText(/severity: critical/i)).toBeVisible();
    await expect(page.getByText(/asset code: USDC, EURC/i)).toBeVisible();
  });

  test("validates priority is a positive number", async ({ page }) => {
    await page.getByRole("button", { name: /create rule/i }).click();

    await page.getByLabel(/rule name/i).fill("Test Rule");
    await page.getByLabel(/priority/i).fill("-1");

    await page.getByRole("button", { name: /save rule/i }).click();

    // Verify validation error
    await expect(page.getByText(/priority must be positive/i)).toBeVisible();
  });
});
