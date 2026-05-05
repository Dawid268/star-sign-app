# Audyt Gotowosci Produkcyjnej Star Sign

Data audytu: 2026-05-04
Zakres: Premium-only release, AICO, logika produktu, UI/responsive, bezpieczenstwo, analityka sprzedazy, CI/CD, Docker Compose, operacje i zaleznosci.
Werdykt po poprawkach: `NO-GO LIVE`, ale techniczne lokalne gate'y release sa zielone.

## Executive Summary

Projekt jest znacznie blizej produkcji niz w raporcie z 2026-05-01. Po poprawkach z 2026-05-04 glowna logika, AICO, UI smoke, E2E, coverage, clean install i oba Docker targety przechodza lokalnie. Premium checkout ma walidacje env, GA4 ma standardowe eventy dla `begin_checkout` i konwersji Premium, Stripe webhook weryfikuje podpis, Redis jest obecny w rate limit/cache, a frontend ma Sentry runtime config i service worker.

Nie podpisuje jeszcze pelnego GO produkcyjnego, bo nie wykonano potwierdzen live: Stripe checkout/webhook/subskrypcja/portal, GA4 DebugView i reczny AICO strict audit w panelu Strapi. Zostaja tez ryzyka do swiadomej akceptacji lub zaplanowania: placeholdery Bugsink, JWT w `localStorage`, brak pinowania digestow obrazow i 16 low/moderate podatnosci w produkcyjnych zaleznosciach `apps/api`.

## Aktualizacja Po Poprawkach 2026-05-04

Zamkniete technicznie:

- `package-lock.json` odswiezony tak, aby `npm ci` na npm 10 przechodzil.
- `docker build --target frontend-runtime` i `docker build --target api-runtime` przechodza.
- Oba runtime obrazy Docker dzialaja jako `USER node`.
- `frontend:test:coverage` przechodzi po dodaniu testu `loading-bar`.
- `frontend-e2e:e2e` przechodzi 72/72 po dodaniu deterministycznego sygnalu gotowosci aplikacji po bootstrapie.
- `frontend-e2e:lint` przechodzi; zostaje 17 warningow.
- Glowny CI ma osobny job E2E.
- `secrets-scan.yml` dziala na `push` do `main`, `pull_request` i `workflow_dispatch`.
- `ops-load-test.yml` uzywa Node 22, zgodnie z wymaganiem `artillery@2.0.31`.
- Caddy waliduje sie i blokuje publiczny dostep do `*.map`.

Pozostaje przed publicznym GO:

- live Stripe checkout monthly/annual, podpisany webhook, aktywacja subskrypcji i Customer Portal,
- GA4 DebugView dla `page_view`, `begin_checkout`, `checkout_redirect`, `purchase`, `premium_subscription_conversion`,
- reczny AICO strict audit w panelu Strapi z `decision=GO`,
- realne sekrety produkcyjne bez placeholderow,
- decyzja w sprawie JWT w `localStorage`,
- decyzja/plan dla 16 low/moderate podatnosci `apps/api`.

## Najwazniejsze Wyniki Gate'ow

| Obszar | Komenda / narzedzie | Wynik |
| --- | --- | --- |
| Workspace | `npm exec -- nx show projects --json` | PASS, 6 projektow: `ai-content-orchestrator`, `cart`, `@org/types`, `frontend-e2e`, `api`, `frontend`. |
| Nx sync | `npm exec -- nx sync:check` | PASS. |
| Compose | `docker compose config --quiet` | PASS. |
| Docker image | `docker build --target frontend-runtime -t star-sign-audit-frontend .` | PASS po odswiezeniu lockfile i hardeningu runtime. |
| Docker image | `docker build --target api-runtime -t star-sign-audit-api .` | PASS po odswiezeniu lockfile i hardeningu runtime. |
| Docker runtime user | `docker image inspect ... --format '{{.Config.User}}'` | PASS: frontend i API maja `node`. |
| Dependency clean install | `npx -p npm@10.8.2 npm ci --dry-run` | PASS. |
| Main build/typecheck/lint | `nx run-many --targets=build,typecheck,lint --projects=api,frontend,cart,@org/types` | PASS, ale z warningami: API 122, frontend 106, cart 4, shared types 1. |
| E2E lint/typecheck | `nx run-many --targets=typecheck,lint --projects=frontend-e2e` | PASS, 17 warningow. |
| Frontend coverage | `nx run frontend:test:coverage` | PASS: 315/315 testow, statements 85.02%, lines 86.09%. |
| Unit tests | `nx run-many --target=test --projects=api,frontend,cart` | PASS: API 49, frontend 315, cart 15 testow. |
| Cart coverage | `nx run cart:test --coverage` | PASS: 100% statements/lines/functions, 88.88% branches. |
| E2E | `nx run frontend-e2e:e2e` | PASS: 72/72 testow po realnym uruchomieniu. |
| AICO local gates | `nx run-many --targets=lint,test:ts:back,test:ts:front,test:unit,verify --projects=ai-content-orchestrator` | PASS, `lint` ma 63 warningi, unit 10/10. |
| Premium content | `nx run api:premium-content-audit` | PASS dla `horoscopes`, `articles`, `aico_workflows`. |
| AICO contract | `nx run api:aico-contract-audit` | PASS, wersja kontraktu `2026-05-02.aico-content-contract.v1`. |
| Root npm audit | `npm audit --omit=dev --json` | PASS: 0 produkcyjnych podatnosci. |
| API npm audit | `apps/api npm audit --omit=dev --json` | WARN: 16 produkcyjnych podatnosci, 2 low i 14 moderate. |
| Secret grep | lokalny scan nazw plikow dla wzorcow `sk_*`, `whsec_*`, `AKIA`, private keys, Slack tokens, Replicate token | Trafienia ograniczone do regexow walidatora i lokalnego `.env`; realnych wartosci nie ujawniano. `.env` nie jest sledzony przez git. |
| Semgrep | MCP + CLI | Nieukonczone: MCP ma bledne ograniczenie katalogu, CLI nie pobral reguly `auto`/`p/owasp-top-ten` przez HTTP 401. |

## Blockery P0

### P0. Brak potwierdzen live przed GO

Kod Premium wyglada poprawnie, ale nie potwierdzono live:

- Stripe live checkout dla monthly i annual,
- podpisany webhook `checkout.session.completed` i eventy `customer.subscription.*`,
- aktywacja subskrypcji w profilu uzytkownika,
- Customer Portal,
- GA4 DebugView dla `page_view`, `begin_checkout`, `checkout_redirect`, `purchase`, `premium_subscription_conversion`,
- reczny AICO strict audit w panelu Strapi z decyzja `GO`.

Bez tych wynikow nie da sie uczciwie powiedziec, ze sprzedaz i analityka sa gotowe.

## P1 Ryzyka Do Zamkniecia Przed Publicznym Launch

| Priorytet | Obszar | Ustalenie | Rekomendacja |
| --- | --- | --- | --- |
| P1 | CI | Glowny workflow ma teraz osobny job `e2e` uruchamiajacy `frontend-e2e:e2e`. | Po pushu potwierdzic wynik w GitHub Actions. |
| P1 | Sourcemapy | Produkcyjny build nadal generuje hidden sourcemapy, ale Caddy blokuje `*.map`. | Docelowo upload do Sentry/Bugsink i rozwazyc `sourcesContent=false`. |
| P1 | Bugsink | Compose ma placeholdery `BUGSINK_POSTGRES_PASSWORD` i `BUGSINK_SECRET_KEY` jako fallback (`docker-compose.yml:41`, `docker-compose.yml:57`). | Usunac produkcyjne fallbacki lub dodac zewnetrzny preflight/env gate dla Bugsink. |
| P1 | Auth security | JWT jest trzymany w `localStorage` (`frontend/src/app/core/services/auth.service.ts:126`, `frontend/src/app/core/services/auth.service.ts:148`). | Zaakceptowac ryzyko na soft launch albo zaplanowac migracje do `Secure HttpOnly SameSite` cookie. |
| P1 | Container hardening | Runtime stages maja teraz `USER node` i kopiuja artefakty z `--chown=node:node`. | Rozwazyc read-only FS/tmpfs jako kolejny etap hardeningu. |
| P1 | Supply chain | Obrazy `node:20-bookworm-slim`, `postgres:16-alpine`, `redis:7-alpine`, `caddy:2-alpine`, `bugsink/bugsink:2` nie sa pinowane digestami. | Pin digestow przynajmniej dla produkcji albo kontrolowana polityka aktualizacji. |
| P1 | API dependencies | `apps/api npm audit --omit=dev` pokazuje 16 produkcyjnych podatnosci: 2 low, 14 moderate. | Ustalic prog akceptacji, aktualizowac Strapi zaleznosci i ponowic audit. |
| P1 | Secrets scan | `secrets-scan.yml` uruchamia sie na PR/push/workflow dispatch. | Po pushu potwierdzic wynik w GitHub Actions. |
| P1 | Load test workflow | `ops-load-test.yml` uzywa Node 22, zgodnie z wymaganiem `artillery@2.0.31`. | Po pushu potwierdzic wynik w GitHub Actions. |
| P1 | Rate limit proxy | Rate limiter wspiera Redis i obejmuje auth/contact/newsletter/checkout/account, ale przy `RATE_LIMIT_TRUST_PROXY=true` bierze pierwszy `x-forwarded-for` (`apps/api/src/middlewares/rate-limit.ts:49-59`). | Upewnic sie, ze Caddy nadpisuje forward headers i request nie moze spoofowac IP klienta. |
| P1 | Observability | Sentry frontend jest zaimplementowane runtime (`frontend/src/main.ts:76-86`), ale env template ma puste `SENTRY_DSN` i `FRONTEND_SENTRY_DSN` oraz `SENTRY_REQUIRED=false` (`.env.example:87-92`). | Na produkcji wymagac Sentry/Bugsink albo jawnie podpisac decyzje o braku error trackingu. |

## P2 Ryzyka I Utrzymanie

| Obszar | Ustalenie | Rekomendacja |
| --- | --- | --- |
| Lint hygiene | Gate przechodzi, ale warningi sa liczne: `any`, unused vars, conditional expect w E2E. | Stopniowo zejsc do 0 warningow albo wymusic zero warnings tylko dla nowych plikow. |
| Strapi build | API build pokazuje warningi `Config file not loaded ... *.d.ts`. | Oczyscic output typecheck/config albo przeniesc generowane `.d.ts`. |
| Headers | Caddy ma HSTS, nosniff i Referrer-Policy, ale nie ma jawnego CSP, `X-Frame-Options`/`frame-ancestors`, `Permissions-Policy`. | Dodac produkcyjny header policy kompatybilny z GA4/Sentry/Turnstile/Stripe. |
| Semgrep | Skan statyczny przez Semgrep nie zostal wykonany przez brak dostepu do reguly registry. | Dodac lokalny zestaw reguly albo skonfigurowac token Semgrep w CI. |
| Dirty worktree | Repo ma bardzo duzo zmienionych i niezatwierdzonych plikow. | Przed release zrobic review zakresu zmian, commit i czysty build z `npm ci`. |

## Co Dziala Dobrze

- Premium checkout wymaga zalogowanego usera i tworzy Stripe Checkout Session z metadata `userId`/`plan` oraz success URL zawierajacym `session_id` i `plan` (`apps/api/src/api/account/controllers/account.ts:448-460`, `apps/api/src/api/account/controllers/account.ts:746-790`).
- Produkcyjna walidacja env obejmuje Stripe live key, webhook secret, Premium price IDs, GA4, Turnstile, Redis/cache, R2 i sekrety Strapi (`apps/api/config/env-validation.ts:240-353`).
- Stripe webhook weryfikuje podpis i obsluguje `checkout.session.completed` oraz `customer.subscription.*` (`apps/api/src/api/stripe/controllers/stripe.ts:221-365`).
- Premium `begin_checkout` zawiera `price`, `value`, `currency` i item GA4 (`frontend/src/app/features/premium/premium.ts:85-99`).
- Panel wysyla `purchase` i `premium_subscription_conversion` raz na `session_id` (`frontend/src/app/features/account/panel/panel.ts:480-496`).
- Runtime config frontendu wystawia GA4, Turnstile i Sentry bez rebuilda (`frontend/src/server.ts:640-657`).
- AICO local quality gates, premium content audit i contract audit przechodza.
- Compose ma Redis, healthchecki API/frontend, Postgres bez publicznego portu i dev-only Mailpit/Stripe CLI.
- Backup, restore test i uptime scripts istnieja w `ops/`.

## Decyzja Release

Status: `NO-GO LIVE`.

Minimalna sciezka do `GO`:

1. Ustawic realne produkcyjne env: Stripe, GA4, Turnstile, Sentry/Bugsink, Brevo, R2, AICO.
2. Wykonac live Stripe: monthly/annual checkout, podpisany webhook, aktywacja subskrypcji i Customer Portal.
3. Wykonac GA4 DebugView dla checkoutu i finalnej konwersji Premium.
4. Wykonac reczny AICO strict audit w panelu Strapi i zapisac `decision=GO`.
5. Potwierdzic GitHub Actions po pushu dla CI, E2E, secrets scan i load testu.
6. Podpisac decyzje w sprawie JWT `localStorage` oraz 16 low/moderate podatnosci `apps/api`.

Assumptions:

- Release dotyczy Premium-only.
- Sklep produktowy i produktowy checkout pozostaja ukryte flagami.
- Nie ujawniano lokalnych sekretow; lokalne `.env` nie jest sledzone przez git, ale zawiera material sekretopodobny i powinno byc traktowane jako wrazliwe.
