# AICO Preflight Audit Runbook

## Decisions

- `GO`: release can be promoted.
- `GO_WITH_WARNINGS`: release is blocked by the production hard gate.
- `NO_GO`: release must not be promoted.

## Manual audit (Admin UI)

1. Open plugin tab `Audit`.
2. Run `Run Strict`.
3. Confirm `Decision: GO`.

## Environment gate (GitHub Actions)

Use workflow `AICO Predeploy Audit`.

Required:

- Input `audit_url` (public API base URL).
- Secret `AICO_AUDIT_BEARER` (token with permission to run strict audit).
- Result must be `decision=GO`.

## API reference

- Soft: `GET /ai-content-orchestrator/audit/preflight`
- Strict: `POST /ai-content-orchestrator/audit/preflight` with body `{ "strict": true }`

## Typical blockers and fixes

- `config.server-url` fail:
  - Set `SERVER_URL` to public API origin and restart API.
- `social.credentials` fail:
  - Complete missing tokens/IDs in workflow social configuration.
- `social.connectivity` fail:
  - Re-authorize social app credentials and rerun `Test Connection`.
- `dr.backup` warning/fail policy:
  - Set `AICO_BACKUP_ENABLED=true` after backup/DR verification.
