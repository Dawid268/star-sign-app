# Decision Log

## Decision: Nie wymuszać migracji Strapi do v4 przez npm audit fix --force

Date: 2026-05-05
Agents involved: Architect, Developer, QA

### Context

`npm audit fix --force` sugeruje instalację pakietów Strapi 4.x dla części advisories, mimo że projekt działa na Strapi 5.44.0.

### Decision

Nie wykonywać force downgrade/migration. Zamykać tylko bezpieczne transitive ryzyka, które nie zmieniają głównej gałęzi Strapi.

### Alternatives considered

- `npm audit fix --force`.
- Globalne override `uuid`, `vite`, `esbuild`.
- Minimalny override `axios`.

### Rationale

Force downgrade Strapi do v4 byłby większym ryzykiem regresji niż obecne low/moderate advisories. Globalne override `uuid`/`vite`/`esbuild` mogłyby złamać niejawne transitive API. `axios` dał się bezpiecznie zdeduplikować.

### Consequences

High vulnerability zostaje zamknięte, ale low/moderate pozostają jako jawny dependency risk.

### Polish summary

Nie robimy ryzykownego downgrade Strapi. Zamykamy high przez `axios`, a resztę klasyfikujemy do osobnej decyzji vendor/risk acceptance.

## Decision: Compose ma failować bez Bugsink sekretów

Date: 2026-05-05
Agents involved: Architect, Developer, QA

### Context

`docker-compose.yml` miał fallbacki `replace_me` dla Bugsink DB i secret key.

### Decision

Zastąpić fallbacki wymaganymi zmiennymi `${VAR:?message}`.

### Alternatives considered

- Zostawić defaulty.
- Walidować tylko w dokumentacji.

### Rationale

Produkcja nie powinna startować z placeholderem przez przypadek.

### Consequences

`docker compose config --quiet` bez `.env` failuje. Z poprawnym env albo `.env.example` do walidacji składni przechodzi.

### Polish summary

Brak Bugsink sekretów ma blokować compose zamiast dawać fałszywe poczucie gotowości.

## Decision: Minimalne CSP zamiast agresywnej polityki

Date: 2026-05-05
Agents involved: Designer, Architect, QA

### Context

Pełne CSP bez testów stagingowych mogłoby zepsuć frontend, GA4, Turnstile, Sentry/Bugsink albo Strapi admin.

### Decision

Dodać minimalne CSP: `frame-ancestors 'none'; base-uri 'self'; object-src 'none'`, plus `X-Frame-Options` i `Permissions-Policy`.

### Alternatives considered

- Brak CSP.
- Pełny restrykcyjny CSP dla script/style/connect/frame.

### Rationale

Minimalna polityka zamyka najważniejsze ryzyka embedding/object/base-uri bez wysokiego ryzyka regresji.

### Consequences

Przed publicznym launch trzeba jeszcze zweryfikować nagłówki na domenie i ewentualnie rozszerzyć CSP po stagingowych screenshotach/smoke.

### Polish summary

Wdrażamy bezpieczny pierwszy krok CSP, a pełną politykę dopracujemy po stagingu.

## Decision: Jeden powtarzalny predeploy gate z trybem local i staging

Date: 2026-05-05
Agents involved: Product Owner, Architect, Developer, QA

### Context

Audyt pokazał, że część dowodów jest lokalna, a część wymaga realnej bazy, tokenu AICO i stagingowych domen. Ręczne listy komend łatwo rozjeżdżają się między raportami.

### Decision

Dodać `ops/predeploy-check.sh` oraz npm scripts `ops:predeploy:local` i `ops:predeploy:staging`.

### Alternatives considered

- Zostawić checklisty tylko w Markdown.
- Dodać osobny workflow GitHub bez lokalnego skryptu.

### Rationale

Lokalny skrypt jest łatwy do uruchomienia przed PR/deployem i może być później użyty także w CI. Tryb staging wymusza realny env i AICO URL/token, żeby nie robić fałszywego preflightu na localhost.

### Consequences

`ops:predeploy:local` daje szybki, powtarzalny gate bez sekretów. `ops:predeploy:staging` wymaga realnego `.env`, DB, `AICO_AUDIT_URL` i `AICO_AUDIT_BEARER`.

### Polish summary

Release gate został zamieniony z listy komend w wykonywalny skrypt z jasnym rozdziałem local/staging.

## Decision: Security headers sprawdzane na edge jako staging gate

Date: 2026-05-05
Agents involved: Architect, Developer, QA

### Context

Nagłówki Caddy zostały dodane lokalnie, ale produkcyjne ryzyko dotyczy realnego edge, TLS i domen. Samo `docker compose config` nie dowodzi, że domena zwraca właściwe nagłówki.

### Decision

Dodać `ops/security-headers-check.sh` i włączyć go w stagingowym predeploy gate przez `RUN_SECURITY_HEADERS=true`.

### Alternatives considered

- Zostawić kontrolę nagłówków jako ręczny curl.
- Wykonywać check zawsze lokalnie.

### Rationale

Lokalny frontend/API zwykle nie pracuje przez Caddy/TLS, więc wymuszanie header check lokalnie byłoby szumem. Na stagingu i produkcji check ma być twardym dowodem edge readiness.

### Consequences

Staging gate wymaga `FRONTEND_BASE_URL` i `API_BASE_URL`. Live domeny nie były sprawdzane bez osobnej autoryzacji.

### Polish summary

Nagłówki bezpieczeństwa są teraz sprawdzalne skryptem i obowiązkowe w stagingowym predeploy gate.

## Decision: Statyczny guard realnego produkcyjnego `.env`

Date: 2026-05-05
Agents involved: Product Owner, Architect, Developer, QA

### Context

Audyt pokazał, że produkcyjny deploy wymaga wielu krytycznych zmiennych: URL-i HTTPS, sekretów Strapi, DB, Redis, GA4, Bugsink, opcjonalnie Turnstile, R2, Stripe, Sentry i AICO. Sama walidacja `docker compose config` nie wykrywa placeholderów, testowych kluczy ani ryzykownych przełączników typu seed/documentation.

### Decision

Dodać `ops/production-env-check.sh`, npm script `ops:env` i włączyć guard w stagingowym predeploy gate przez `RUN_ENV_GUARD=true`.

### Alternatives considered

- Zostawić checklistę ręczną w dokumentacji.
- Sourcing `.env` i walidacja w Node/TypeScript.
- Sprawdzać tylko brakujące zmienne przez Docker Compose.

### Rationale

Prosty skrypt POSIX działa przed startem kontenerów, nie wypisuje wartości sekretów i jest łatwy do uruchomienia lokalnie, w CI oraz na serwerze deployowym. Nie wymaga nowych zależności ani dostępu do live usług.

### Consequences

Staging/production gate failuje, jeśli realny `.env` ma placeholdery, localhost, HTTP URL-e, zbyt krótkie sekrety, testowe klucze Stripe albo włączone ryzykowne flagi produkcyjne. Realny `.env` nadal musi zostać uruchomiony poza audytem, bo w repo nie przechowujemy sekretów.

### Polish summary

Produkcja ma teraz twardy, automatyczny check konfiguracji środowiska przed startem. To nie zastępuje smoke testów live, ale blokuje najczęstsze błędy sekretów i placeholderów.
