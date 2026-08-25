import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../middleware/auth.js";
import {
  ControlPlaneConflictError,
  operationalControlPlaneService,
  type ChangeStatus,
  type ErrorSeverity,
} from "../../services/operationalControlPlane.service.js";

const requireOps = authMiddleware({ requiredScopes: ["admin:operations"] });
const requireCatalogAdmin = authMiddleware({ requiredScopes: ["admin:error-catalog"] });
const requireSamplingAdmin = authMiddleware({ requiredScopes: ["admin:sampling"] });

function errorResponse(reply: any, error: unknown) {
  const message = error instanceof Error ? error.message : "Operation failed";
  if (error instanceof ControlPlaneConflictError) return reply.code(409).send({ error: "Conflict", message });
  if (/not found/i.test(message)) return reply.code(404).send({ error: "Not Found", message });
  return reply.code(400).send({ error: "Bad Request", message });
}

export async function operationalControlPlaneRoutes(server: FastifyInstance) {
  server.get<{ Querystring: { environment?: string; status?: ChangeStatus } }>("/api/v1/operations/changes", { preHandler: requireOps }, async (request) => ({ changes: await operationalControlPlaneService.listChanges(request.query.environment, request.query.status) }));

  server.post<{ Body: { changeType: string; environment: string; summary: string; description: string; payload?: Record<string, unknown>; requiredApprovals?: number; expiresAt: string } }>("/api/v1/operations/changes", { preHandler: requireOps }, async (request, reply) => {
    try {
      return reply.code(201).send(await operationalControlPlaneService.createChange({ ...request.body, proposedBy: request.apiKeyAuth?.name ?? "unknown", expiresAt: new Date(request.body.expiresAt) }));
    } catch (error) { return errorResponse(reply, error); }
  });

  server.post<{ Params: { id: string }; Body: { decision: "approved" | "rejected"; comment?: string; expectedVersion?: number } }>("/api/v1/operations/changes/:id/decision", { preHandler: requireOps }, async (request, reply) => {
    try {
      return reply.send(await operationalControlPlaneService.approveChange(request.params.id, request.apiKeyAuth?.name ?? "unknown", request.body.decision, request.body.comment, request.body.expectedVersion));
    } catch (error) { return errorResponse(reply, error); }
  });

  server.post<{ Params: { id: string }; Body: { expectedVersion?: number } }>("/api/v1/operations/changes/:id/execute", { preHandler: requireOps }, async (request, reply) => {
    try { return reply.send(await operationalControlPlaneService.executeChange(request.params.id, request.apiKeyAuth?.name ?? "unknown", request.body.expectedVersion)); }
    catch (error) { return errorResponse(reply, error); }
  });

  server.get<{ Querystring: { code?: string } }>("/api/v1/admin/error-catalog", { preHandler: requireCatalogAdmin }, async (request) => ({ entries: await operationalControlPlaneService.listErrors(request.query.code) }));
  server.put<{ Params: { code: string }; Body: { severity: ErrorSeverity; httpStatus: number; messageTemplate: string; remediation: string; retryable: boolean } }>("/api/v1/admin/error-catalog/:code", { preHandler: requireCatalogAdmin }, async (request, reply) => {
    try { return reply.code(201).send(await operationalControlPlaneService.upsertError({ ...request.body, code: request.params.code, updatedBy: request.apiKeyAuth?.name ?? "unknown" })); }
    catch (error) { return errorResponse(reply, error); }
  });

  server.get<{ Querystring: { environment?: string } }>("/api/v1/admin/request-sampling", { preHandler: requireSamplingAdmin }, async (request) => ({ policies: await operationalControlPlaneService.listSamplingPolicies(request.query.environment) }));
  server.put<{ Body: { environment: string; routePattern: string; sampleRate: number; enabled: boolean } }>("/api/v1/admin/request-sampling", { preHandler: requireSamplingAdmin }, async (request, reply) => {
    try { return reply.send(await operationalControlPlaneService.upsertSamplingPolicy({ ...request.body, updatedBy: request.apiKeyAuth?.name ?? "unknown" })); }
    catch (error) { return errorResponse(reply, error); }
  });
}
