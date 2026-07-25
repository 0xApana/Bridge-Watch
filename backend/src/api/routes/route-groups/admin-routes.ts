import type { FastifyInstance } from "fastify";
import { apiKeysRoutes } from "../apiKeys.js";
import { rateLimitAdminRoutes } from "../rateLimitAdmin.js";
import { tracingAdminRoutes } from "../tracingAdmin.js";
import { validationAdminRoutes } from "../validationAdmin.js";
import { auditRoutes } from "../audit.js";
import { adminRotationRoutes } from "../adminRotation.js";
import { accessOverviewRoutes } from "../accessOverview.routes.js";
import { operationalAccessAuditRoutes } from "../operationalAccessAudit.js";
import { providerAllowlistAdminRoutes } from "../providerAllowlistAdmin.routes.js";
import { eventSourceKeyRoutes } from "../eventSourceKeys.routes.js";

export async function registerAdminRoutes(server: FastifyInstance): Promise<void> {
  server.register(apiKeysRoutes, { prefix: "/api/v1/admin/api-keys" });
  server.register(rateLimitAdminRoutes, { prefix: "/api/v1/admin/rate-limit" });
  server.register(tracingAdminRoutes, { prefix: "/api/v1/admin/tracing" });
  server.register(validationAdminRoutes, {
    prefix: "/api/v1/admin/validation",
  });
  server.register(auditRoutes, { prefix: "/api/v1/admin/audit" });
  server.register(adminRotationRoutes, { prefix: "/api/v1/admin/rotation" });
  server.register(accessOverviewRoutes, {
    prefix: "/api/v1/admin/access-overview",
  });
  server.register(operationalAccessAuditRoutes, {
    prefix: "/api/v1/admin/access-audit",
  });
  server.register(providerAllowlistAdminRoutes, {
    prefix: "/api/v1/admin/providers/allowlist",
  });
  server.register(eventSourceKeyRoutes, {
    prefix: "/api/v1/admin/event-source-keys",
  });
}
