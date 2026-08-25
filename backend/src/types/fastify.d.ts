import "fastify";
import type { TenantContext } from "../multi-tenant/tenantContext.js";

declare module "fastify" {
  interface FastifyRequest {
    apiKeyAuth?: {
      id: string;
      name: string;
      scopes: string[];
      rateLimitPerMinute: number;
      source: "api-key" | "bootstrap";
    };
    tenantContext?: TenantContext;
  }

  interface FastifySchema {
    hide?: boolean;
    deprecated?: boolean;
    tags?: readonly string[];
    description?: string;
    summary?: string;
    consumes?: readonly string[];
    produces?: readonly string[];
    externalDocs?: Record<string, unknown>;
    security?: ReadonlyArray<Record<string, readonly string[]>>;
    operationId?: string;
  }

  interface RouteShorthandOptions {
    websocket?: boolean;
  }

  interface FastifyContextConfig {
    rateLimit?: {
      max?: number;
      timeWindow?: string | number;
      skip?: (request: FastifyRequest) => boolean | Promise<boolean>;
    };
  }
}
