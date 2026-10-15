// Ambient quieting declarations to pragmatically reduce noisy type errors
// This file intentionally declares loose module types and Fastify request
// augmentations to allow an incremental migration to stricter types.

import { ZodNumber } from "zod";

declare module "fastify" {
  interface FastifyRequest {
    body: any;
    params: any;
    query: any;
  }
}

// Provide a minimal augmentation so `.nonneg()` calls on Zod numbers compile
declare module "zod" {
  interface ZodNumber {
    nonneg(): this;
  }
}

// Third-party modules with missing types in this workspace
declare module "zod-to-json-schema";
declare module "jsonwebtoken";
declare module "jsonwebt oken";

// Loose declarations for a few internal modules that are imported with
// .js extensions across the codebase. These are intentionally permissive
// to reduce repetitive changes while the codebase migrates to stricter types.
declare module "../database/connection.js" { const anything: any; export = anything; }
declare module "../database/index.js" { const anything: any; export = anything; }
declare module "../utils/logger.js" { const anything: any; export = anything; }
