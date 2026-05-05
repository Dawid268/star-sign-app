# AICO Production Deploy Checklist

## Required configuration

- `SERVER_URL` is set to public API origin (for example `https://api.star-sign.pl`).
- `AICO_BACKUP_ENABLED=true` is set in runtime environment.
- Social credentials are complete for every enabled workflow:
  - Facebook: `fb_page_id` + page token
  - Instagram: `ig_user_id` + token
  - X: `x_api_key` + `x_api_secret` + `x_access_token` + `x_access_token_secret`

## Access and RBAC

- Plugin actions are registered in Strapi Admin (`manage-social`, `run-audit`, `view-runs`, `manage-workflows`).
- Release operator role can call:
  - `POST /ai-content-orchestrator/audit/preflight`
  - `POST /ai-content-orchestrator/social/test-connection`
  - `POST /ai-content-orchestrator/social/dry-run`

## Pipeline gates

- CI passes:
  - `ai-content-orchestrator:lint`
  - `ai-content-orchestrator:test:ts:back`
  - `ai-content-orchestrator:test:ts:front`
  - `ai-content-orchestrator:test:unit`
  - `ai-content-orchestrator:verify`
- AICO strict audit is checked manually in Strapi Admin before enabling autonomous workflows.
- Default deployment policy: AICO audit does not block deploy.

## Operational readiness

- Social tab has no unresolved `failed`/stale tickets.
- Audit tab returns report and does not show runtime `needs_action` errors.
- Dry-run publish succeeds for all enabled channels in production workflow.
