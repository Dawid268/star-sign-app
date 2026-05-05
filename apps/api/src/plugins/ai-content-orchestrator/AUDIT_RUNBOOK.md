# AICO Preflight Audit Runbook

## Decisions

- `GO`: release can be promoted.
- `GO_WITH_WARNINGS`: release is blocked by the production hard gate.
- `NO_GO`: release must not be promoted.

## Manual audit (Admin UI)

1. Open plugin tab `Audit`.
2. Run `Run Strict`.
3. Confirm `Decision: GO`.

## Deployment policy

Production deploy is not blocked by a remote AICO audit token. Run the strict audit manually from Strapi Admin before enabling autonomous workflows or after changing AICO configuration.

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
