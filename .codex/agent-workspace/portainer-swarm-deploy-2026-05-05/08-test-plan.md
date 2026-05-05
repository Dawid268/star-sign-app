# Test Plan

## Walidacje lokalne

- `rtk sh -n ops/predeploy-check.sh`
- `rtk sh -n ops/production-env-check.sh`
- `rtk docker compose -f ops/portainer/star-sign-production-stack.yml --env-file .env.example config --quiet`
- `rtk npm exec -- nx sync:check`
- `rtk git diff --check`

## Walidacje CI po pushu

- Branch/PR workflow: lint, typecheck, unit tests, build.
- Main workflow: release gate, Docker build/push, Portainer webhook.

## Walidacje po deployu

- `ops:smoke`
- `ops:headers`
- `frontend-e2e:e2e` z `BASE_URL=https://star-sign.pl`
- AICO predeploy audit
- ręczny check Strapi Media Library dla URL z `cdn.star-sign.pl`

## Polska konkluzja

Bez sekretów można potwierdzić składnię i spójność stacka. Pełny dowód produkcyjny wymaga GitHub secrets, Portainer webhooka i realnych domen.
