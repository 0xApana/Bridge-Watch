import type { FastifyInstance } from "fastify";
import { sourceHealthRoutes } from "../sourceHealth.routes.js";
import { sourceHealthScoringRoutes } from "../sourceHealthScoring.routes.js";
import { sourceDecommissionRoutes } from "../sourceDecommission.routes.js";

export async function registerSourceRoutes(server: FastifyInstance): Promise<void> {
  server.register(sourceHealthRoutes, { prefix: "/api/v1/sources/health" });
  server.register(sourceHealthScoringRoutes, {
    prefix: "/api/v1/sources/health-scoring",
  });
  server.register(sourceDecommissionRoutes, {
    prefix: "/api/v1/sources/decommission",
  });
}
