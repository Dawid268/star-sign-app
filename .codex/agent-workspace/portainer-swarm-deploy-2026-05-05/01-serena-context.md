# Serena Context

## Odczytane pamięci

- `project/predeploy_gate_2026_05_05`
- `project/production_env_gate_2026_05_05`
- `project/security_headers_gate_2026_05_05`
- `project/production_remediation_2026_05_05`

## Ustalenia z repo

- Workspace Nx ma projekty: `frontend`, `api`, `cart`, `@org/types`, `frontend-e2e`, `ai-content-orchestrator`.
- `Dockerfile` ma już targety `api-runtime` i `frontend-runtime`.
- Frontend jest Angular SSR i uruchamia Node `dist/frontend/server/server.mjs` na porcie `4000`.
- API używa Strapi i ma gotową konfigurację Cloudflare R2 przez `R2_UPLOAD_ENABLED=true` oraz provider `@strapi/provider-upload-aws-s3`.
- Obecny `docker-compose.yml` jest lokalno-produkcyjnym wariantem z Caddy i Bugsink, ale docelowy Portainer Swarm za Traefikiem potrzebuje osobnego stacka.
- `ops/predeploy-check.sh`, `ops/production-env-check.sh`, `ops/security-headers-check.sh` i `ops/smoke.sh` istnieją i mogą być użyte w GitHub Actions.

## Polska konkluzja

Najbezpieczniej dodać osobny stack Portainer/Swarm zamiast przebudowywać obecny compose. CI powinno pozostać Nx-centric, a deploy powinien budować dwa obrazy z istniejących targetów Dockerfile.
