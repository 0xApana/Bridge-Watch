# Operational Control Plane

This document covers issues #1060 (operational change approvals), #1059 (structured error catalog), and #1058 (request sampling controls).

## API Contract

All endpoints require an API key or bearer token. Required scopes are `admin:operations`, `admin:error-catalog`, and `admin:sampling` respectively.

- `GET /api/v1/operations/changes?environment=&status=` lists change requests.
- `POST /api/v1/operations/changes` creates a pending request with `changeType`, `environment`, `summary`, `description`, optional `payload`, `requiredApprovals`, and ISO `expiresAt`.
- `POST /api/v1/operations/changes/:id/decision` records one approval or rejection. The proposer cannot approve their own request. `expectedVersion` prevents stale updates.
- `POST /api/v1/operations/changes/:id/execute` executes an approved request and records the executor. This endpoint changes workflow state only; integrations should perform the actual side effect from the approved payload.
- `GET /api/v1/admin/error-catalog?code=` lists all immutable versions.
- `PUT /api/v1/admin/error-catalog/:code` publishes a new active version with `severity`, `httpStatus`, `messageTemplate`, `remediation`, and `retryable`.
- `GET /api/v1/admin/request-sampling?environment=` lists policies.
- `PUT /api/v1/admin/request-sampling` upserts `{ environment, routePattern, sampleRate, enabled }`, where `sampleRate` is between `0` and `1`.

Successful writes return the created or updated resource. Authentication failures are `401`/`403`; malformed values are `400`; stale approvals are `409`; missing resources are `404`. Clients may retry network errors and `5xx` with bounded exponential backoff and jitter. Never retry `400`, `401`, `403`, `404`, or `409` without reloading state.

## Persistence Contract

Migration `056_operational_control_plane` creates `operational_change_requests`, append-only `operational_change_approvals`, versioned `error_catalog_entries`, and environment/route keyed `request_sampling_policies`. Existing APIs and tables are unchanged. Error catalog updates deactivate prior versions but never delete them. Sampling policy upserts are idempotent on `(environment, route_pattern)`.

## Authorization And Safety

The proposer identity is taken from the authenticated API key name, not from request input. Approval requires a different identity, one decision per approver, quorum, non-expiry, and optimistic version matching. Execution requires `approved` status. Error catalog and sampling administration are separated into independent scopes. Sampling policy evaluation uses a SHA-256 request bucket, making a request consistently sampled for a given policy.

## Observability

Structured logs are emitted for change creation, approval/rejection, execution, error publication, and sampling updates. Logs include IDs, environment, actor, decision, and policy metadata, but never payload secrets or credentials. Monitor `4xx`/`5xx` rates, approval age, expired requests, rejected changes, catalog publication failures, and sampling policy update failures. Trace IDs and request IDs are supplied by the existing tracing middleware.

## Rollout

1. Back up PostgreSQL and apply migration `056_operational_control_plane`.
2. Deploy the backend and verify each new route with a scoped staging API key.
3. Publish baseline error catalog entries before switching clients to structured codes.
4. Start sampling at `1.0`, then reduce rates gradually while monitoring trace coverage and error rates.
5. Enable approval enforcement for one staging environment before production.

## Rollback And Support

Older application versions ignore the new tables, so application rollback is safe while migration `056` remains applied. To remove the feature completely, deploy the older application first, retain a backup, then run the migration down; this discards approvals, catalog history, and sampling policies. If approval or policy writes fail, stop administrative changes, inspect database connectivity and scope assignments, and retry after state reload. If traces disappear after sampling changes, set the affected policy to `sampleRate: 1` and verify propagation. For a catalog issue, restore the prior version by publishing its content as a new version rather than deleting history.
