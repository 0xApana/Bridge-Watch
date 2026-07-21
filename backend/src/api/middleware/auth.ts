import type { FastifyRequest, FastifyReply } from "fastify";
import { ApiKeyService } from "../../services/apiKey.service.js";
import { OAuth2Service } from "../../services/oauth2.service.js";

interface AuthOptions {
  requiredScopes?: string[];
}

const apiKeyService = new ApiKeyService();
const oauth2Service = new OAuth2Service();

function normalizeApiKeyHeader(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return typeof value === "string" ? value : null;
}

function extractBearerToken(authHeader: string | string[] | undefined): string | null {
  const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  
  if (!header || typeof header !== "string") {
    return null;
  }

  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  
  return null;
}

function hasRequiredScopes(granted: string[], required: string[]): boolean {
  if (!required.length) {
    return true;
  }
  if (granted.includes("*")) {
    return true;
  }
  return required.every((scope) => granted.includes(scope));
}

/**
 * Unified authentication middleware supporting both API keys and JWT tokens.
 * Accepts either x-api-key header or Authorization: Bearer <token> header.
 */
export function authMiddleware(options: AuthOptions = {}) {
  return async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const apiKey = normalizeApiKeyHeader(request.headers["x-api-key"]);
    const bearerToken = extractBearerToken(request.headers.authorization);

    if (bearerToken) {
      const validation = oauth2Service.verifyToken(bearerToken);

      if (!validation.valid || !validation.payload) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: validation.error || "Invalid or expired token",
        });
      }

      const tokenScopes = oauth2Service.extractScopesFromToken(validation.payload);
      const requiredScopes = options.requiredScopes ?? [];

      if (requiredScopes.length > 0 && !hasRequiredScopes(tokenScopes, requiredScopes)) {
        return reply.status(403).send({
          error: "Forbidden",
          message: "Token does not have required scopes",
        });
      }

      const apiKeyList = await apiKeyService.listKeys();
      const keyRecord = apiKeyList.find((k) => k.id === validation.payload?.sub);

      request.apiKeyAuth = {
        id: validation.payload.sub,
        name: keyRecord?.name || validation.payload.client_id,
        scopes: tokenScopes,
        rateLimitPerMinute: keyRecord?.rateLimitPerMinute || 120,
        source: "api-key",
      };
      return;
    }

    if (apiKey) {
      try {
        const validated = await apiKeyService.validateKey(
          apiKey,
          options.requiredScopes ?? [],
          request.ip
        );

        if (!validated) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "Invalid API key or missing required scope.",
          });
        }

        request.apiKeyAuth = validated;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to validate API key";
        const statusCode = message.includes("rate limit") ? 429 : 403;
        return reply.status(statusCode).send({
          error: statusCode === 429 ? "Too Many Requests" : "Forbidden",
          message,
        });
      }
      return;
    }

    return reply.status(401).send({
      error: "Unauthorized",
      message: "Missing authentication. Provide x-api-key header or Authorization: Bearer <token>.",
    });
  };
}
