# Test Plan

## Lokalnie wykonane lub dostępne dowody

- `rtk npm exec -- nx sync:check`: PASS.
- `rtk docker compose config --quiet`: PASS.
- `rtk npm ci --dry-run`: PASS.
- `rtk npm --prefix apps/api ci --dry-run`: PASS.
- `rtk npm exec -- nx run-many -t lint --projects=frontend,api,cart,@org/types,frontend-e2e,ai-content-orchestrator --outputStyle=static`: PASS, 0 errors, warnings remain.
- `rtk npm exec -- nx run-many -t typecheck --projects=frontend,api,cart,@org/types,frontend-e2e --outputStyle=static`: PASS.
- `rtk npm exec -- nx run cart:test --outputStyle=static`: PASS, 15 tests.
- `rtk npm exec -- nx run-many --targets=test:unit,test:ts:back,test:ts:front,verify --projects=ai-content-orchestrator --outputStyle=static`: PASS.
- `rtk git diff --check`: PASS.

## Dowody z tej samej sesji po implementacji maintenance mode

- `rtk npm exec -- nx run api:test --outputStyle=static`: PASS, 107 tests.
- `rtk npm exec -- nx run api:typecheck --outputStyle=static`: PASS.
- `rtk npm exec -- nx run api:build --outputStyle=static`: PASS.
- `rtk npm exec -- nx run @org/types:typecheck --outputStyle=static`: PASS.
- `rtk npm exec -- nx run frontend:typecheck --outputStyle=static`: PASS.
- `rtk npm exec -- nx run frontend:test --configuration=coverage`: PASS, 338 tests, statements 85.53%, lines 86.59%.
- `rtk npm exec -- nx run frontend:lint --outputStyle=static`: PASS with 108 warnings.
- `rtk npm exec -- nx run frontend:build:production --outputStyle=static`: PASS.
- `rtk npm exec -- nx run frontend-e2e:typecheck --outputStyle=static`: PASS.
- `rtk npm exec -- nx run frontend-e2e:lint --outputStyle=static`: PASS with 17 warnings.
- `rtk npm exec -- nx run frontend-e2e:e2e --outputStyle=static`: PASS, 76/76.

## Testy, które nie przeszły lokalnie

- `rtk npm exec -- nx run api:premium-content-audit --outputStyle=static`: FAIL, `Cannot open database because the directory does not exist`.
- `rtk npm exec -- nx run api:aico-contract-audit --outputStyle=static`: FAIL, `Cannot open database because the directory does not exist`.
- `rtk npm exec -- nx run ai-content-orchestrator:audit:preflight:ci --outputStyle=static`: FAIL, brakuje `AICO_AUDIT_BEARER` lub `--token`.

## Security/dependency checks

- Root `rtk npm audit --omit=dev --json`: PASS, 0 vulnerabilities.
- `apps/api` `rtk npm --prefix apps/api audit --omit=dev --json`: FAIL, 27 vulnerabilities: 2 low, 24 moderate, 1 high.
- Lokalny scan wzorców sekretów tracked files: 4 trafienia, wszystkie wyglądają na false positives lub placeholdery/test keys, bez realnych sekretów.

## Wymagane testy przed publicznym startem

- Audyty domenowe API na realnej/stagingowej bazie.
- AICO preflight CI z tokenem.
- Staging smoke testy dla maintenance, app settings, Premium open, auth, contact, newsletter, analytics, content pages i checkout disabled.
- Paid Premium test dopiero po świadomym włączeniu `premium_mode=paid` i `stripe_checkout_enabled=true`.
- Backup restore test.
- Monitoring/error tracking smoke.
- Security headers check na domenie.

## Polska konkluzja

Lokalne testy aplikacyjne są w dużej mierze zielone, ale test plan produkcyjny nie jest zamknięty. Najważniejsze luki to audyty domenowe zależne od bazy, AICO preflight, dependency audit API i staging/live smoke.
