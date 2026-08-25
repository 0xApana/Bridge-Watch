# Config Rollback Preview

Config rollback preview lets an operator compare an active database-backed configuration with an immutable historical revision. Preview is read-only; this feature does not add an apply-rollback operation.

## API Contract

`POST /api/v1/admin/configs/{environment}/{key}/rollback-preview`

Authentication requires an API key or bearer token with `admin:config`. Request body:

```json
{
  "targetRevision": 2,
  "expectedCurrentRevision": 5
}
```

`expectedCurrentRevision` is optional. Supplying it is recommended because a `409 Revision conflict` prevents an operator from relying on a preview made against changed state. A successful response contains `currentRevision`, `targetRevision`, `changed`, current and target values, target author/reason/time, and current-schema validation. Sensitive values are always returned as `[REDACTED]`.

Responses are `200` for a valid target, `401`/`403` for authentication or scope failure, `404` for a missing config or revision, `409` for stale current state, and `422` when the historical value no longer passes the current schema. Clients may retry `5xx` and network failures with exponential backoff and jitter. Do not automatically retry `4xx`; reload current state after `409` and request a fresh preview.

## Persistence Contract

Migration `055_config_rollback_preview` adds `configs.current_revision` and append-only `config_revisions`. Revisions store the encrypted-at-rest value, encryption and validation flags, actor, reason, and timestamp. `(config_id, revision)` is unique. Existing rows are backfilled as revision `1`; future successful writes atomically update the current value, audit log, and revision snapshot.

The existing config read, write, delete, import, export, and audit response formats are unchanged. Existing consumers require no migration. Services that write directly to `configs` must migrate to `ConfigService.set` so a revision is recorded.

## Observability And Support

Successful previews emit structured `Config rollback preview generated` logs with environment, key, current revision, and target revision. Values and API keys are never logged. Existing request logging captures status and latency; alert on elevated `5xx`, `409`, or `422` rates for this route. A missing revision after a successful migration indicates a direct database write or incomplete backfill.

For support, confirm the caller has `admin:config`, verify the config and target revision exist, inspect current-schema validation errors, and compare `expectedCurrentRevision` with `configs.current_revision`. Never request secret values from an operator or paste API keys into tickets.

## Rollout And Rollback

1. Back up PostgreSQL and apply migration `055_config_rollback_preview` before deploying application instances.
2. Verify every existing `configs` row has revision `1`, then deploy the backend and frontend.
3. Smoke test a non-sensitive staging key with an `admin:config` credential and confirm no config row changes.
4. Monitor route errors, latency, and revision insert failures during config writes.

Application rollback is safe while the migration remains applied; older application versions ignore the new column and table. To fully roll back, first deploy the older application, then run the migration down. The down migration removes revision history and `current_revision`, so retain a database backup if the history may be needed. If revision inserts fail during rollout, stop config writes, roll back the application, repair or re-run the migration, and verify backfill counts before retrying.
