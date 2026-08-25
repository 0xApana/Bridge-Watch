import { describe, expect, it, vi } from "vitest";
import { ConfigRevisionConflictError, ConfigService } from "../../src/services/config-service/ConfigService.js";

function createService(current: Record<string, unknown> | null, target: Record<string, unknown> | null) {
  const db = vi.fn((table: string) => {
    const row = table === "configs" ? current : target;
    const query = {
      where: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(row),
    };
    return query;
  });
  const redis = {
    duplicate: vi.fn().mockReturnThis(),
    subscribe: vi.fn((_channel, callback) => callback(null)),
    on: vi.fn(),
  };
  return new ConfigService(db as any, redis as any, "test-encryption-key-32-bytes!!");
}

describe("ConfigService.previewRollback", () => {
  it("returns a read-only, schema-validated comparison", async () => {
    const service = createService(
      { id: 7, value: 250, encrypted: false, current_revision: 3 },
      { value: 100, encrypted: false, revision: 1, created_at: new Date("2026-01-01"), created_by: "ops", change_reason: "baseline" }
    );

    const preview = await service.previewRollback("RATE_LIMIT_MAX", "staging", 1, 3);

    expect(preview).toMatchObject({ currentRevision: 3, targetRevision: 1, changed: true });
    expect(preview.validation).toEqual({ valid: true });
    expect(preview.currentValue).toBe(250);
    expect(preview.targetValue).toBe(100);
  });

  it("redacts both values for sensitive keys", async () => {
    const service = createService(
      { id: 8, value: "current-secret-value-that-is-long", encrypted: false, current_revision: 2 },
      { value: "target-secret-value-that-is-long!", encrypted: false, revision: 1, created_at: new Date(), created_by: "ops", change_reason: "rotate" }
    );

    const preview = await service.previewRollback("JWT_SECRET", "global", 1);

    expect(preview.sensitive).toBe(true);
    expect(preview.currentValue).toBe("[REDACTED]");
    expect(preview.targetValue).toBe("[REDACTED]");
  });

  it("reports historical values that no longer pass validation", async () => {
    const service = createService(
      { id: 9, value: 100, encrypted: false, current_revision: 2 },
      { value: -1, encrypted: false, revision: 1, created_at: new Date(), created_by: "ops", change_reason: "legacy" }
    );

    const preview = await service.previewRollback("RATE_LIMIT_MAX", "staging", 1);

    expect(preview.validation.valid).toBe(false);
  });

  it("rejects a preview generated against stale current state", async () => {
    const service = createService(
      { id: 10, value: 100, encrypted: false, current_revision: 4 },
      { value: 50, encrypted: false, revision: 1, created_at: new Date(), created_by: "ops", change_reason: "baseline" }
    );

    await expect(service.previewRollback("RATE_LIMIT_MAX", "staging", 1, 3))
      .rejects.toBeInstanceOf(ConfigRevisionConflictError);
  });

  it("fails when the requested revision does not exist", async () => {
    const service = createService(
      { id: 11, value: 100, encrypted: false, current_revision: 2 },
      null
    );

    await expect(service.previewRollback("RATE_LIMIT_MAX", "staging", 99))
      .rejects.toThrow("Revision 99 not found");
  });
});
