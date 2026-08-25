import { createHash } from "crypto";
import type { Knex } from "knex";
import { getDatabase } from "../database/connection.js";
import { logger } from "../utils/logger.js";

export type ChangeStatus = "pending" | "approved" | "rejected" | "expired" | "executed";
export type ErrorSeverity = "info" | "warn" | "error" | "critical";

export interface ChangeRequest {
  id: string;
  changeType: string;
  environment: string;
  summary: string;
  description: string;
  payload: Record<string, unknown>;
  proposedBy: string;
  status: ChangeStatus;
  requiredApprovals: number;
  approvals: Array<{ approver: string; decision: "approved" | "rejected"; comment: string | null }>;
  expiresAt: Date;
  version: number;
}

export interface ErrorCatalogEntry {
  code: string;
  version: number;
  severity: ErrorSeverity;
  httpStatus: number;
  messageTemplate: string;
  remediation: string;
  retryable: boolean;
  active: boolean;
  updatedBy: string;
}

export interface SamplingPolicy {
  environment: string;
  routePattern: string;
  sampleRate: number;
  enabled: boolean;
  updatedBy: string;
}

export class ControlPlaneConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ControlPlaneConflictError";
  }
}

function parseJson<T>(value: T | string): T {
  return typeof value === "string" ? JSON.parse(value) as T : value;
}

export class OperationalControlPlaneService {
  constructor(private readonly db: Knex = getDatabase()) {}

  async createChange(input: {
    changeType: string; environment: string; summary: string; description: string;
    payload?: Record<string, unknown>; proposedBy: string; requiredApprovals?: number; expiresAt: Date;
  }): Promise<ChangeRequest> {
    if (input.requiredApprovals !== undefined && (!Number.isInteger(input.requiredApprovals) || input.requiredApprovals < 1)) {
      throw new Error("requiredApprovals must be a positive integer");
    }
    if (input.expiresAt <= new Date()) throw new Error("expiresAt must be in the future");
    const [row] = await this.db("operational_change_requests").insert({
      change_type: input.changeType, environment: input.environment, summary: input.summary,
      description: input.description, payload: JSON.stringify(input.payload ?? {}), proposed_by: input.proposedBy,
      required_approvals: input.requiredApprovals ?? 1, expires_at: input.expiresAt, version: 1,
    }).returning("*");
    logger.info({ changeId: row.id, environment: input.environment }, "Operational change request created");
    return this.mapChange(row, []);
  }

  async listChanges(environment?: string, status?: ChangeStatus): Promise<ChangeRequest[]> {
    const query = this.db("operational_change_requests").select("*").orderBy("created_at", "desc");
    if (environment) query.where({ environment });
    if (status) query.where({ status });
    const rows = await query;
    return Promise.all(rows.map(async (row: any) => this.mapChange(row, await this.getApprovals(row.id))));
  }

  async approveChange(id: string, approver: string, decision: "approved" | "rejected", comment?: string, expectedVersion?: number): Promise<ChangeRequest> {
    return this.db.transaction(async (trx) => {
      const row = await trx("operational_change_requests").where({ id }).forUpdate().first();
      if (!row) throw new Error(`Change request not found: ${id}`);
      if (row.proposed_by === approver) throw new Error("The proposer cannot approve their own change");
      if (row.status !== "pending") throw new Error(`Change request is not pending: ${row.status}`);
      if (new Date(row.expires_at) <= new Date()) throw new Error("Change request has expired");
      if (expectedVersion !== undefined && expectedVersion !== row.version) throw new ControlPlaneConflictError("Change request version is stale");
      const existing = await trx("operational_change_approvals").where({ change_request_id: id, approver }).first();
      if (existing) throw new Error("Approver has already recorded a decision");
      await trx("operational_change_approvals").insert({ change_request_id: id, approver, decision, comment: comment ?? null });
      const approvals = await trx("operational_change_approvals").where({ change_request_id: id, decision: "approved" });
      const status = decision === "rejected" ? "rejected" : approvals.length >= row.required_approvals ? "approved" : "pending";
      const [updated] = await trx("operational_change_requests").where({ id, version: row.version }).update({ status, version: row.version + 1, approved_at: status === "approved" ? trx.fn.now() : null, updated_at: trx.fn.now() }).returning("*");
      if (!updated) throw new ControlPlaneConflictError("Change request was updated concurrently");
      logger.info({ changeId: id, approver, decision, status }, "Operational change decision recorded");
      return this.mapChange(updated, await trx("operational_change_approvals").where({ change_request_id: id }));
    });
  }

  async executeChange(id: string, executor: string, expectedVersion?: number): Promise<ChangeRequest> {
    const [updated] = await this.db("operational_change_requests").where({ id, status: "approved", ...(expectedVersion === undefined ? {} : { version: expectedVersion }) }).update({ status: "executed", executed_by: executor, executed_at: new Date(), version: this.db.raw("version + 1"), updated_at: new Date() }).returning("*");
    if (!updated) throw new ControlPlaneConflictError("Change is not approved or version is stale");
    logger.info({ changeId: id, executor }, "Operational change executed");
    return this.mapChange(updated, await this.getApprovals(id));
  }

  async upsertError(input: Omit<ErrorCatalogEntry, "version" | "active"> & { version?: number }): Promise<ErrorCatalogEntry> {
    if (!/^BW-[A-Z0-9_]+$/.test(input.code)) throw new Error("Error code must match BW-[A-Z0-9_]+");
    if (input.httpStatus < 400 || input.httpStatus > 599) throw new Error("httpStatus must be between 400 and 599");
    const latest = await this.db("error_catalog_entries").where({ code: input.code }).max("version as version").first();
    const version = input.version ?? (Number(latest?.version ?? 0) + 1);
    await this.db("error_catalog_entries").where({ code: input.code }).update({ active: false });
    const [row] = await this.db("error_catalog_entries").insert({ ...input, version, http_status: String(input.httpStatus), message_template: input.messageTemplate, updated_by: input.updatedBy, active: true }).returning("*");
    logger.info({ code: input.code, version }, "Error catalog entry published");
    return this.mapError(row);
  }

  async listErrors(code?: string): Promise<ErrorCatalogEntry[]> {
    const query = this.db("error_catalog_entries").select("*").orderBy([{ column: "code", order: "asc" }, { column: "version", order: "desc" }]);
    if (code) query.where({ code });
    return (await query).map((row: any) => this.mapError(row));
  }

  async upsertSamplingPolicy(input: SamplingPolicy): Promise<SamplingPolicy> {
    if (!Number.isFinite(input.sampleRate) || input.sampleRate < 0 || input.sampleRate > 1) throw new Error("sampleRate must be between 0 and 1");
    const [row] = await this.db("request_sampling_policies").insert({ environment: input.environment, route_pattern: input.routePattern, sample_rate: input.sampleRate, enabled: input.enabled, updated_by: input.updatedBy }).onConflict(["environment", "route_pattern"]).merge({ sample_rate: input.sampleRate, enabled: input.enabled, updated_by: input.updatedBy, updated_at: this.db.fn.now() }).returning("*");
    logger.info({ environment: input.environment, routePattern: input.routePattern, sampleRate: input.sampleRate }, "Request sampling policy updated");
    return this.mapSampling(row);
  }

  async listSamplingPolicies(environment?: string): Promise<SamplingPolicy[]> {
    const query = this.db("request_sampling_policies").select("*").orderBy("route_pattern", "asc");
    if (environment) query.where({ environment });
    return (await query).map((row: any) => this.mapSampling(row));
  }

  shouldSample(policy: SamplingPolicy, requestId: string): boolean {
    if (!policy.enabled || policy.sampleRate <= 0) return false;
    if (policy.sampleRate >= 1) return true;
    const bucket = Number.parseInt(createHash("sha256").update(`${policy.routePattern}:${requestId}`).digest("hex").slice(0, 8), 16) / 0xffffffff;
    return bucket < policy.sampleRate;
  }

  private async getApprovals(id: string) { return this.db("operational_change_approvals").where({ change_request_id: id }).orderBy("created_at", "asc"); }
  private mapChange(row: any, approvals: any[]): ChangeRequest { return { id: row.id, changeType: row.change_type, environment: row.environment, summary: row.summary, description: row.description, payload: parseJson(row.payload), proposedBy: row.proposed_by, status: row.status, requiredApprovals: row.required_approvals, approvals: approvals.map((a) => ({ approver: a.approver, decision: a.decision, comment: a.comment })), expiresAt: row.expires_at, version: row.version }; }
  private mapError(row: any): ErrorCatalogEntry { return { code: row.code, version: row.version, severity: row.severity, httpStatus: Number(row.http_status), messageTemplate: row.message_template, remediation: row.remediation, retryable: row.retryable, active: row.active, updatedBy: row.updated_by }; }
  private mapSampling(row: any): SamplingPolicy { return { environment: row.environment, routePattern: row.route_pattern, sampleRate: Number(row.sample_rate), enabled: row.enabled, updatedBy: row.updated_by }; }
}

export const operationalControlPlaneService = new OperationalControlPlaneService();
