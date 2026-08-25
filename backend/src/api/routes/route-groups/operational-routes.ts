import type { FastifyInstance } from "fastify";
import { slowQueryRegressionRoutes } from "../slowQueryRegression.routes.js";
import { rollbackReadinessRoutes } from "../rollbackReadiness.routes.js";
import { canaryMetricRoutes } from "../canaryMetric.routes.js";
import { promotionGatesRoutes } from "../promotionGates.routes.js";
import { operationalControlPlaneRoutes } from "../operationalControlPlane.routes.js";

export async function registerOperationalRoutes(server: FastifyInstance): Promise<void> {
  server.register(slowQueryRegressionRoutes);
  server.register(rollbackReadinessRoutes);
  server.register(canaryMetricRoutes);
  server.register(promotionGatesRoutes);
  server.register(operationalControlPlaneRoutes);
}
