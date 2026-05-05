# System Architect Analysis

## Aktualny obraz systemu

- Monorepo Nx z projektami: `frontend`, `api`, `cart`, `@org/types`, `frontend-e2e`, `ai-content-orchestrator`.
- API działa na Strapi, frontend na Angular, AICO jako plugin Strapi.
- App Settings są centralnym panelem dla Premium i maintenance mode.
- Rate limiting API obejmuje auth, contact, newsletter, checkout, account subscription i analytics.
- Middleware rate limit wspiera Redis i ma tryb fail-closed, jeśli Redis jest wymagany.

## Najważniejsze ryzyka architektoniczne

- `apps/api` ma 27 podatności produkcyjnych z `npm audit --omit=dev`, w tym 1 high związany z `axios` i transitive Strapi packages.
- Audyty domenowe `api:premium-content-audit` i `api:aico-contract-audit` nie przeszły lokalnie z powodu brakującego katalogu bazy danych.
- AICO preflight CI wymaga sekretu i nie został wykonany.
- `frontend/src/app/core/services/auth.service.ts` nadal używa `localStorage` dla tokenu użytkownika, co jest świadomym ryzykiem XSS/session theft.
- `docker-compose.yml` zawiera placeholdery Bugsink i fallbacki, które nie mogą trafić jako realna konfiguracja produkcyjna.
- `ops/Caddyfile` ma podstawowe security headers, ale brakuje pełnego CSP/frame policy/Permissions-Policy.

## Ocena deploymentu

- Deployment techniczny za maintenance mode jest architektonicznie sensowny jako etap przejściowy.
- Publiczny launch wymaga dowodów na realnym środowisku, bo lokalne testy nie pokrywają sekretów, reverse proxy, DB, webhooków, providerów, GA4 i routingu domen.
- Paid Premium wymaga osobnego go/no-go po Stripe test/live readiness.

## Decyzje architektoniczne

- Nie zdejmować maintenance mode publicznie bez zielonych audytów domenowych i preflight AICO.
- Nie aktywować paid Premium bez dwóch flag i walidacji Stripe webhook/portal/success/cancel.
- Nie uznawać lokalnego PASS testów za równoważny gotowości produkcyjnej.

## Polska konkluzja

Architektura ma dobre przełączniki operacyjne, ale decyzja produkcyjna jest blokowana przez security/dependency debt, brak dowodów środowiskowych i niedokończone audyty domenowe. Zalecany kolejny krok to staging za maintenance mode, a nie publiczny launch.
