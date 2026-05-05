# QA Report

## Co sprawdzono

- Stan repozytorium i rozmiar zmian.
- Projekty Nx i główne targety lint/typecheck/test.
- Root i API dependency audit.
- Docker Compose config.
- Wzorce potencjalnych sekretów w tracked files.
- Najważniejsze znane ryzyka: App Settings, Premium switch, maintenance mode, AICO preflight, rate limiting, auth token storage, Caddy headers, Bugsink placeholders.

## Wyniki pozytywne

- Nx sync check przechodzi.
- Typecheck dla głównych projektów przechodzi.
- Lint przechodzi bez errors, choć warnings pozostają.
- Cart tests i AICO plugin test/verify przechodzą.
- Root dependency audit ma 0 podatności produkcyjnych.
- `git diff --check` przechodzi.
- Maintenance mode ma świeże testy API/frontend/e2e z tej samej sesji.
- Sekret scan tracked files nie znalazł realnych sekretów, tylko placeholdery/test values.

## Wyniki negatywne / braki

- `apps/api` ma 27 produkcyjnych podatności npm audit, w tym 1 high.
- `api:premium-content-audit` i `api:aico-contract-audit` nie przeszły lokalnie przez brak katalogu bazy.
- `ai-content-orchestrator:audit:preflight:ci` nie przeszedł bez `AICO_AUDIT_BEARER`.
- Working tree jest bardzo brudny i wymaga przeglądu zakresu.
- Nie wykonano live Stripe, live GA4 ani aktywnych testów produkcji.
- Nie ma świeżych stagingowych screenshotów i smoke evidence dla wszystkich kluczowych widoków.

## Klasyfikacja ryzyk

### P0

- API dependency vulnerabilities: 27 total, 1 high.
- Brak zielonych domenowych audytów API na realnej bazie.
- Brak AICO preflight evidence.
- Brak kompletnego staging/live smoke przed publicznym ruchem.
- Brudny working tree bez zatwierdzonego zakresu release.

### P1

- JWT w `localStorage`.
- Placeholdery/fallbacki Bugsink w compose/env.
- Brak pełnych security headers w Caddy.
- Rate limit wymaga weryfikacji realnego `trustProxy` i Redis behavior.
- Brak potwierdzonego backup restore.

### P2

- Lint warnings.
- Stare lub usunięte audyty Markdown wymagają uporządkowania dokumentacji release.
- Brak mobile/WebKit full matrix w obecnym audycie.

## Werdykt QA

- Public production: **NO-GO**.
- Deployment za maintenance mode na staging/production: **GO warunkowe**, po CI z czystego checkoutu i kompletnej konfiguracji środowiska.
- Paid Premium: **NO-GO** do czasu pełnego Stripe readiness i audytu webhook/portal/success/cancel.

## Polska konkluzja

Jakość lokalna jest wyraźnie lepsza niż typowy stan “przed refaktorem”, ale dowody produkcyjne są nadal niepełne. Nie rekomenduję zdejmowania maintenance ani puszczania publicznego ruchu przed domknięciem P0.
