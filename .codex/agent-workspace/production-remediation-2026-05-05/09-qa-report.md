# QA Report

## Zaimplementowane zmiany

- `apps/api/package.json`: dodano override `axios` przez `$axios`, żeby nested Strapi packages nie trzymały podatnego `axios@1.15.1`.
- `apps/api/package-lock.json`: odświeżony po install, nested `@strapi/admin/node_modules/axios` i `@strapi/cloud-cli/node_modules/axios` zostały usunięte, root `axios` jest `1.16.0`.
- `apps/api/scripts/audit-sqlite.js`: nowy helper sprawdzający, czy SQLite DB istnieje.
- `premium-content-audit.js` i `aico-contract-audit.js`: używają helpera i zwracają czytelny błąd przy braku lokalnej bazy.
- `ops/Caddyfile`: dodano wspólny snippet security headers z `X-Frame-Options`, minimalnym CSP i `Permissions-Policy`.
- `docker-compose.yml`: Bugsink nie ma już cichych fallbacków `replace_me`; brak `BUGSINK_SECRET_KEY` lub `BUGSINK_POSTGRES_PASSWORD` blokuje interpolację compose.
- `ops/smoke.sh`: dodano kontrolę publicznych App Settings i grep na secret-looking fields/values.
- `ops/predeploy-check.sh`: dodano powtarzalny lokalny/stagingowy predeploy gate.
- `ops/security-headers-check.sh`: dodano edge security headers check dla staging/produkcji.
- `ops/production-env-check.sh`: dodano statyczny guard realnego `.env` produkcyjnego bez wypisywania sekretów.
- `package.json`: dodano `ops:predeploy:local`, `ops:predeploy:staging`, `ops:env`, `ops:headers` i `ops:smoke`.
- `docs/launch-handoff.md` i `docs/ops/production-operations.md`: zaktualizowano komendy release gate.

## Walidacje PASS

- `rtk npm --prefix apps/api install --package-lock-only`: PASS.
- `rtk npm exec -- nx run api:test --outputStyle=static`: PASS, 107 tests.
- `rtk npm exec -- nx run api:typecheck --outputStyle=static`: PASS.
- `rtk npm exec -- nx run api:lint --outputStyle=static`: PASS, 0 errors, 148 warnings.
- `rtk npm exec -- nx run api:build --outputStyle=static`: PASS.
- `rtk npm exec -- nx sync:check`: PASS.
- `rtk npm --prefix apps/api ci --dry-run`: PASS.
- `rtk npm audit --omit=dev --json`: PASS, 0 vulnerabilities.
- `rtk npm --prefix apps/api audit --omit=dev --audit-level=high`: PASS.
- `rtk docker compose --env-file .env.example config --quiet`: PASS.
- `rtk sh -n ops/smoke.sh`: PASS.
- `rtk node -c apps/api/scripts/audit-sqlite.js`: PASS.
- `rtk node -c apps/api/scripts/premium-content-audit.js`: PASS.
- `rtk node -c apps/api/scripts/aico-contract-audit.js`: PASS.
- `rtk git diff --check`: PASS.
- `rtk sh -n ops/predeploy-check.sh`: PASS.
- `rtk sh -n ops/security-headers-check.sh`: PASS.
- `rtk sh -n ops/production-env-check.sh`: PASS.
- `rtk npm run ops:predeploy:local`: PASS.
- `rtk bash -lc 'PRODUCTION_ENV_FILE=.env.example sh ops/production-env-check.sh; echo exit=$?'`: FAIL oczekiwany, 43 issues, exit=1. Skrypt wypisał nazwy kluczy i typ problemu, bez wartości sekretów.
- `rtk sh -c 'PREDEPLOY_SCOPE=staging RUN_DOMAIN_AUDITS=false RUN_AICO_PREFLIGHT=false sh ops/predeploy-check.sh'`: FAIL oczekiwany, wymaga realnego `COMPOSE_ENV_FILE`.
- `rtk sh -c 'COMPOSE_ENV_FILE=.env PREDEPLOY_SCOPE=staging RUN_DOMAIN_AUDITS=false RUN_AICO_PREFLIGHT=true AICO_AUDIT_BEARER=test sh ops/predeploy-check.sh'`: FAIL oczekiwany, wymaga `AICO_AUDIT_URL`.
- `rtk bash -lc 'SECURITY_HEADER_URLS=http://localhost sh ops/security-headers-check.sh; echo exit=$?'`: FAIL oczekiwany, wymaga HTTPS URL.
- `rtk bash -lc 'SECURITY_HEADER_URLS= sh ops/security-headers-check.sh; echo exit=$?'`: FAIL oczekiwany, wymaga URL-i do sprawdzenia.

## Wyniki kontrolowane / nadal wymagające środowiska

- `rtk docker compose config --quiet` bez `.env` teraz failuje na brak `BUGSINK_SECRET_KEY`. To jest zamierzone, żeby nie uruchamiać produkcyjnego compose z cichym placeholderem.
- `rtk npm exec -- nx run api:premium-content-audit --outputStyle=static`: FAIL kontrolowany, brak `apps/api/.tmp/data.db`.
- `rtk npm exec -- nx run api:aico-contract-audit --outputStyle=static`: FAIL kontrolowany, brak `apps/api/.tmp/data.db`.
- `rtk npm --prefix apps/api audit --omit=dev --json`: FAIL na poziomie low/moderate, ale high spadł do 0. Aktualnie: 2 low, 15 moderate, 0 high, 17 total.
- `ops:predeploy:local` celowo pomija frontend full test/build, domenowe audyty DB, AICO preflight i e2e, jeśli nie są jawnie włączone. Tryb staging włącza te wymagania.
- Security headers check nie był wykonywany na żywej domenie, bo aktywne testy produkcji wymagają osobnej autoryzacji. Zostały sprawdzone składnia i guardy lokalne.
- Production env guard nie był uruchamiany na realnym `.env`, żeby nie przetwarzać ani nie ujawniać sekretów w tym audycie. Został zweryfikowany składniowo i na `.env.example` jako kontrolowany fail.

## Pozostałe ryzyka

- Strapi v5.44.0 jest najnowszy według `npm view @strapi/strapi version`, ale npm audit nadal sugeruje breaking downgrade/force do v4 dla części advisories. Nie wdrażano takiej zmiany.
- `uuid`, `vite`, `esbuild`, `elliptic` i powiązane Strapi advisories wymagają vendor update, formalnej akceptacji ryzyka albo dalszej analizy wpływu.
- AICO preflight nadal wymaga `AICO_AUDIT_BEARER`.
- Live Stripe/GA4 i staging smoke nadal nie były wykonywane.

## Polska konkluzja

Remediacja poprawiła stan produkcyjny: high w API audit został zamknięty, compose nie ukrywa już Bugsink placeholderów, smoke test sprawdza publiczne App Settings, a staging gate ma statyczną kontrolę realnego `.env`. Publiczny launch nadal nie jest automatycznie GO, bo pozostają audyty na realnej bazie, AICO preflight i staging/live dowody.
