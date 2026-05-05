# Implementation Plan

## Kroki

1. Zaktualizować `.github/workflows/ci.yml`, żeby działał na każdy push i PR oraz wykonywał branch quality gate.
2. Dodać `.github/workflows/deploy-production.yml` dla `main` i `workflow_dispatch`.
3. Dodać `ops/portainer/star-sign-production-stack.yml` z obrazami GHCR, Traefikiem, zasobami, R2 i Redis password.
4. Dodać dokumentację `ops/portainer/README.md`.
5. Umożliwić `ops/predeploy-check.sh` walidację dowolnego compose file przez `COMPOSE_FILE`.
6. Dostosować `ops/production-env-check.sh` do stacka bez Bugsink i z obowiązkowym `REDIS_PASSWORD`.
7. Uzupełnić `.env.example` i dokumentację ops.

## Polska konkluzja

Zmiany są infrastrukturalne i nie powinny zmieniać zachowania aplikacji lokalnie poza nowymi wymaganiami produkcyjnego env guarda.
