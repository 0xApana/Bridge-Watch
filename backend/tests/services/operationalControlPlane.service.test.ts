import { describe, expect, it, vi } from "vitest";
import { OperationalControlPlaneService } from "../../src/services/operationalControlPlane.service.js";

function serviceWithDb() {
  const db = vi.fn((table: string) => {
    const query: any = {
      insert: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "change-1", change_type: "config", environment: "staging", summary: "Change", description: "Safe", payload: "{}", proposed_by: "alice", status: "pending", required_approvals: 1, expires_at: new Date(Date.now() + 60_000), version: 1 }]),
      where: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([]),
      max: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockReturnThis(),
      onConflict: vi.fn().mockReturnThis(),
      merge: vi.fn().mockReturnThis(),
    };
    if (table === "operational_change_approvals") query.where = vi.fn().mockResolvedValue([]);
    return query;
  });
  return { service: new OperationalControlPlaneService(db as any), db };
}

describe("OperationalControlPlaneService", () => {
  it("creates a pending change and rejects past expiry", async () => {
    const { service } = serviceWithDb();
    await expect(service.createChange({ changeType: "config", environment: "staging", summary: "Change", description: "Safe", proposedBy: "alice", expiresAt: new Date(Date.now() + 60_000) })).resolves.toMatchObject({ status: "pending" });
    await expect(service.createChange({ changeType: "config", environment: "staging", summary: "Change", description: "Safe", proposedBy: "alice", expiresAt: new Date(Date.now() - 1) })).rejects.toThrow("future");
  });

  it("validates catalog codes, statuses, and sampling boundaries", async () => {
    const { service } = serviceWithDb();
    await expect(service.upsertError({ code: "bad", severity: "error", httpStatus: 500, messageTemplate: "bad", remediation: "fix", retryable: false, updatedBy: "admin" })).rejects.toThrow("BW-");
    await expect(service.upsertSamplingPolicy({ environment: "staging", routePattern: "/api", sampleRate: 2, enabled: true, updatedBy: "admin" })).rejects.toThrow("between 0 and 1");
  });

  it("evaluates sampling deterministically", () => {
    const { service } = serviceWithDb();
    const policy = { environment: "staging", routePattern: "/api", sampleRate: 1, enabled: true, updatedBy: "admin" };
    expect(service.shouldSample(policy, "request-1")).toBe(true);
    expect(service.shouldSample({ ...policy, sampleRate: 0 }, "request-1")).toBe(false);
    expect(service.shouldSample(policy, "request-1")).toBe(service.shouldSample(policy, "request-1"));
  });
});
