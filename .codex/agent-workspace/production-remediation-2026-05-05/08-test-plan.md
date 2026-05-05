# Test Plan

## Lokalnie

- `rtk npm --prefix apps/api install --package-lock-only`
- `rtk npm --prefix apps/api audit --omit=dev --json`
- `rtk npm exec -- nx run api:test --outputStyle=static`
- `rtk npm exec -- nx run api:typecheck --outputStyle=static`
- `rtk docker compose config --quiet`
- `rtk git diff --check`
- `rtk sh -n ops/predeploy-check.sh`
- `rtk sh -n ops/security-headers-check.sh`
- `rtk sh -n ops/production-env-check.sh`
- `rtk npm run ops:predeploy:local`
- negatywny env check na `.env.example`
- negatywne guardy staging dla braku `COMPOSE_ENV_FILE`, `AICO_AUDIT_URL` oraz `FRONTEND_BASE_URL/API_BASE_URL`

## Oczekiwane luki po tej fazie

- AICO preflight dalej wymaga `AICO_AUDIT_BEARER`.
- Live Stripe/GA4 dalej poza zakresem.
- Pozostałe moderate/low dependency advisories Strapi mogą wymagać formalnej akceptacji.

## Polska konkluzja

QA skupia się na tym, czy lokalne poprawki nie psują API i czy redukują najważniejszy mierzalny risk z audytu.
