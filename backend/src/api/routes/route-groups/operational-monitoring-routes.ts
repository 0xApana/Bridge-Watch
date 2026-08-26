import type { FastifyInstance } from "fastify";
import { ledgerCloseDelayRoutes } from "../ledgerCloseDelay.routes.js";
import { horizonCursorAuditRoutes } from "../horizonCursorAudit.routes.js";

export async function registerOperationalMonitoringRoutes(server: FastifyInstance): Promise<void> {
  server.register(ledgerCloseDelayRoutes, {
    prefix: "/api/v1/ledger-close-delays",
  });
  server.register(horizonCursorAuditRoutes, {
    prefix: "/api/v1/horizon-cursor-audit",
  });
}
