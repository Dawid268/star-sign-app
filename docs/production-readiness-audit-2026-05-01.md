# Audyt Gotowosci Produkcyjnej Star Sign

> Aktualizacja 2026-05-04: ten raport jest historyczny i zawiera czesc nieaktualnych wnioskow. Biezacy audyt znajduje sie w `docs/production-readiness-audit-2026-05-04.md`.

Data audytu: 2026-05-01
Zakres: monorepo Nx, Strapi API, Angular SSR frontend, Docker Compose, CI, testy, zaleznosci, podstawowe ryzyka bezpieczenstwa.
Status po weryfikacji: 80% gotowosci, `NO-GO` do czasu zamkniecia blockerow P0/P1.

## 1. Metodyka i zrodla weryfikacji

Audyt zostal zweryfikowany lokalnie na workspace `/home/dawid/Projekty/star-sign` z uzyciem skill'i `nx-workspace`, `strapi`, `angular-developer` i `code-reviewer`.

Wykorzystane MCP:

| MCP                            | Wynik                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `nx_mcp.nx_docs`               | Potwierdzono podejscie Nx do CI i taskow.                                                      |
| `docker.docker_compose_config` | Zweryfikowano runtime compose, env, healthchecki i brak Redis.                                 |
| `angular_cli.list_projects`    | Narzedzie nie wykrylo workspace Angular; analiza frontendu wykonana przez Nx i pliki projektu. |

Najwazniejsze komendy weryfikacyjne:

| Komenda                                                                                            | Wynik                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm exec -- nx show projects --json`                                                              | 6 projektow: `frontend`, `api`, `cart`, `@org/types`, `frontend-e2e`, `ai-content-orchestrator`. |
| `npm exec -- nx run-many -t typecheck --all`                                                       | PASS.                                                                                            |
| `npm exec -- nx run-many -t build --projects=frontend,api,cart,@org/types,ai-content-orchestrator` | PASS.                                                                                            |
| `npm exec -- nx run-many -t lint --all`                                                            | FAIL, `frontend:lint` ma 2 bledy.                                                                |
| `npm exec -- nx run cart:test --coverage --watch=false`                                            | PASS, 15 testow, 100% statements/lines/functions, 88.88% branches.                               |
| `npm exec -- nx run frontend:test --coverage --watch=false`                                        | PASS, 207 testow, 75.32% statements, 76.73% lines.                                               |
| `npm exec -- nx run frontend-e2e:e2e`                                                              | FAIL przed testami, port 4200 byl zajety przez lokalny proces.                                   |
| `npm audit --json` w root                                                                          | 43 podatnosci: 31 moderate, 12 high.                                                             |
| `npm audit --json` w `apps/api`                                                                    | 35 podatnosci: 2 low, 17 moderate, 16 high.                                                      |

Weryfikacja najnowszych wersji przez `npm view`:

| Pakiet            |  W repo | Latest w npm w trakcie audytu | Wniosek                                                          |
| ----------------- | ------: | ----------------------------: | ---------------------------------------------------------------- |
| `@strapi/strapi`  |  5.43.0 |                        5.44.0 | Audyt wejsciowy blednie oznaczyl 5.43.0 jako najnowsze stabilne. |
| `@angular/core`   | ~21.2.0 |                       21.2.11 | Stack jest aktualny majorowo, ale nie na najnowszym patchu.      |
| `nx`              |  22.7.0 |                        22.7.1 | Brakuje patch update.                                            |
| `@sentry/angular` |    brak |                       10.51.0 | Frontend nie ma SDK Sentry w zaleznosciach.                      |

Zrodla zewnetrzne uzyte do sanity-checku wersji: [Strapi 5.44.0](https://newreleases.io/project/npm/%40strapi/strapi/release/5.44.0), [Angular core 21.2.11](https://newreleases.io/project/npm/%40angular/core/release/21.2.11), [Nx 22.7.1](https://newreleases.io/project/npm/nx/release/22.7.1), [Sentry JS SDK 10.51.0](https://sentry.io/changelog/javascript-sdk-10510/).

## 2. Executive Summary

Projekt ma solidna baze: Nx monorepo jest czytelne, build produkcyjny przechodzi, typecheck calego workspace'u przechodzi, Strapi ma konfiguracje PostgreSQL/R2/Sentry, frontend ma SSR/hydration, dynamiczny `sitemap.xml`, healthchecki i niezly poziom testow jednostkowych w logice serwisowej.

Nie jest to jednak gotowe do bezpiecznego startu produkcyjnego. Najwieksze ryzyka to rate limiting oparty o lokalny `Map`, brak Redis/cache, brak fail-fast walidacji env, brak Sentry we frontendzie, podatnosci npm, nieskuteczny lint gate i niewystarczajacy globalny coverage UI.

Najwazniejsze korekty wzgledem audytu wejsciowego:

| Teza z audytu wejsciowego                                      | Status po weryfikacji                                                                                                                                                                     |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cart` ma coverage ponizej 10%                                 | Nieaktualne dla targetu `cart:test`: 100% statements/lines/functions. Nadal w `frontend:test` importowane pliki `cart` obnizaja globalny coverage.                                        |
| `breadcrumbs` ma ok. 30% coverage i bledy przy zagniezdzeniu   | Niepotwierdzone. Aktualnie `breadcrumbs.ts` ma 95.23% lines i 96.49% statements. Kod nadal ma ograniczenie: bierze pierwsza galaz children i uzywa `any`, ale nie jest to niski coverage. |
| `@sentry/angular` jest w zaleznosciach, ale brak inicjalizacji | Czesciej gorzej: pakietu `@sentry/angular` w ogole nie ma w root dependencies.                                                                                                            |
| PWA calkowicie brak                                            | Czesciowo nieaktualne: jest `manifest.webmanifest`. Brakuje `@angular/service-worker`, `ngsw-config.json` i realnego offline support.                                                     |
| Strapi 5.43.0 to najnowsza stabilna                            | Nieaktualne: `npm view @strapi/strapi version` zwrocilo 5.44.0.                                                                                                                           |
| `ExpressionChangedAfterItHasBeenCheckedError` w auth testach   | Swieze testy przechodza, ale logi i template nadal wskazuja ryzyko przez `[disabled]` na kontrolkach reactive forms.                                                                      |

## 3. Blockery Przed Produkcja

### P0. Rate limiting nie jest produkcyjny

Plik: `apps/api/src/middlewares/rate-limit.ts`

Aktualny limiter:

| Problem                                                                | Skutek                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Uzywa globalnego `Map` w procesie Node                                 | Limity nie dziela sie miedzy repliki, PM2 cluster, kontenery ani deploymenty rolling. |
| Klucz klienta bierze `x-forwarded-for` bez weryfikacji zaufanego proxy | Klient moze zmieniac header i obchodzic limit.                                        |
| Brak Redis albo innego wspoldzielonego store                           | Brak kontroli przy skalowaniu poziomym.                                               |
| Domyslna lista chronionych sciezek nie obejmuje `/api/contact`         | Publiczny formularz kontaktowy moze byc spamowany.                                    |
| W lokalnym compose z MCP `RATE_LIMIT_ENABLED=false`                    | Latwo wdrozyc kontener z wylaczonym mechanizmem, jesli env nie jest walidowany.       |

Wymagane:

- Zastapic `Map` store'em Redis, np. `ioredis`.
- Nie ufac surowemu `x-forwarded-for`; oprzec identyfikacje o zaufane proxy lub jawna konfiguracje.
- Dodac `/api/contact`, `/api/newsletter/*`, auth, checkout i account endpoints do listy limitow.
- Dodac testy na reset okna, wiele instancji store'a i spoofowany `x-forwarded-for`.
- W produkcji fail-fast, jesli `RATE_LIMIT_ENABLED=false`.

### P0. Brak walidacji runtime dla konfiguracji produkcyjnej

Pliki: `.env.example`, `apps/api/config/*`, `frontend/src/server.ts`, `docker-compose.yml`

`.env.example` jest szeroki i uzyteczny, ale aplikacja nie waliduje krytycznych zmiennych przy starcie. W Strapi konfiguracja ma domysly typu `sqlite`, `localhost`, pusty `SERVER_URL`, pusty `SENTRY_DSN`, lokalne URL-e i placeholdery. To jest dopuszczalne w dev, ale nie w produkcji.

Wymagane:

- Dodac walidator env dla `NODE_ENV=production`, np. Zod/envalid.
- Zablokowac start, gdy sekrety maja wartosci `replace_me`, `local_*`, sa puste albo za krotkie.
- Zablokowac produkcje z `DATABASE_CLIENT=sqlite`.
- Zablokowac produkcje z `CORS_ORIGIN` zawierajacym localhost.
- Zablokowac produkcje z `SENTRY_DSN` pustym, jesli observability ma byc wymagane.
- Walidowac komplet R2, Stripe i Brevo tylko gdy odpowiadajace funkcje sa wlaczone.

Uwaga operacyjna: MCP `docker_compose_config` pokazal lokalne `.env` z wartosciami lokalnymi, wylaczonym rate limitingiem i niepusta wartoscia tokena zewnetrznego. W raporcie nie ujawniam wartosci. Jesli ten token byl realny, nalezy rozwazyc rotacje.

### P0. Publiczne porty w `docker-compose.yml`

Plik: `docker-compose.yml`

`postgres` publikuje `5432:5432`, a `mailpit` publikuje `8025:8025` i `1025:1025`. Na VPS bez dodatkowego firewalla oznacza to ekspozycje bazy i narzedzia mailowego na hosta.

Wymagane:

- Usunac publiczny mapping Postgresa w produkcji albo ograniczyc do `127.0.0.1`.
- Przeniesc `mailpit` i `stripe` CLI do profilu dev/test, nie domyslnego production compose.
- Dodac osobny `docker-compose.prod.yml` albo profile `dev`, `ops`, `prod`.

### P0. Frontend nie ma Sentry

Pliki: `package.json`, `frontend/src/app/app.config.ts`

W repo nie ma `@sentry/angular`, a `app.config.ts` nie inicjalizuje Sentry. Backend ma `@strapi/plugin-sentry`, ale jest wlaczany tylko gdy `SENTRY_DSN` jest ustawiony.

Wymagane:

- Dodac `@sentry/angular`.
- Dodac `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, sampling i release do konfiguracji frontendu.
- Zintegrowac Angular error handler i router instrumentation.
- Upewnic sie, ze source mapy nie sa publicznie wystawione bez kontroli dostepu.

### P0/P1. Podatnosci npm

Wyniki:

| Zakres               | Wynik                                       |
| -------------------- | ------------------------------------------- |
| root `npm audit`     | 43 podatnosci: 31 moderate, 12 high.        |
| `apps/api npm audit` | 35 podatnosci: 2 low, 17 moderate, 16 high. |

Najwazniejsze pakiety w wysokich podatnosciach obejmuja Strapi oraz `lodash`. Dry-run `npm audit fix` wskazuje m.in. aktualizacje Strapi do 5.44.0, ale nie nalezy robic tego automatycznie bez pelnego build/test.

Wymagane:

- Podniesc rodzine Strapi do 5.44.0 i ponowic `api:build`, `api:typecheck`, smoke test admina i endpointow.
- Podniesc Nx do 22.7.1 i Angular patch do 21.2.11.
- Po aktualizacji ponowic oba audyty npm.
- Ustalic dopuszczalny prog audit w CI, np. brak `high` w produkcyjnych zaleznosciach.

### P1. Lint gate nie przechodzi

Komenda: `npm exec -- nx run-many -t lint --all`

Wynik: FAIL przez `frontend:lint`.

Blokujace bledy:

| Plik                                                          | Problem                                  |
| ------------------------------------------------------------- | ---------------------------------------- |
| `frontend/src/app/core/services/astrology.service.spec.ts:45` | `@ts-ignore` zamiast `@ts-expect-error`. |
| `frontend/src/app/core/services/astrology.service.spec.ts:47` | `@ts-ignore` zamiast `@ts-expect-error`. |

Dodatkowo jest duzo ostrzezen `any` i unused vars, szczegolnie w pluginie AICO oraz testach frontendu. To nie blokuje builda, ale obniza utrzymywalnosc i utrudnia wlaczenie ostrzejszych quality gates.

## 4. Backend Strapi API

### Mocne strony

| Obszar           | Ocena                                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| Struktura Strapi | Poprawna struktura `apps/api/src/api/*` i custom plugin AICO.          |
| Build            | `api:build` przechodzi.                                                |
| Typecheck        | `api:typecheck` przechodzi.                                            |
| Baza danych      | Produkcyjny compose wymusza PostgreSQL. Dev template dopuszcza SQLite. |
| Healthcheck      | `/api/health` i `/api/health/ready` istnieja; ready sprawdza DB.       |
| Upload           | Jest konfiguracja R2/S3 i rozszerzenie optymalizacji obrazow do WebP.  |
| Stripe webhook   | Jest weryfikacja podpisu HMAC i tolerancja czasu.                      |
| Newsletter       | Jest double opt-in, tokeny i obsluga webhook secret.                   |
| Sentry backend   | Plugin jest zainstalowany i warunkowo wlaczany przez `SENTRY_DSN`.     |

### Ryzyka i braki

| Priorytet | Obszar           | Ustalenie                                                                                              | Rekomendacja                                                                                     |
| --------- | ---------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| P0        | Rate limit       | Lokalny `Map`, brak Redis, spoofowalny `x-forwarded-for`, brak `/api/contact`.                         | Redis store, zaufane proxy, pelna lista sciezek, fail-fast env.                                  |
| P0        | Docker           | Publiczne mapowanie Postgresa i Mailpit.                                                               | Profile prod/dev, usunac publiczne porty w prod.                                                 |
| P0        | Env              | Brak runtime validation.                                                                               | Zod/envalid i blokada startu dla placeholderow.                                                  |
| P0/P1     | Zaleznosci       | 16 high w `apps/api`, Strapi 5.43.0 nie jest najnowszym patchem.                                       | Upgrade Strapi 5.44.0 i ponowny audit.                                                           |
| P1        | Cache            | Brak Redis/cache dla publicznych odczytow artykulow, horoskopow i znakow.                              | Cache aplikacyjny lub CDN/HTTP cache z invalidacja po publikacji.                                |
| P1        | Media cleanup    | Nie znaleziono lifecycle cleanup dla plikow osieroconych po usunieciu wpisow.                          | Job sprzatajacy lub lifecycle, ktory usuwa relacje/nieuzywane pliki zgodnie z polityka retencji. |
| P1        | Contact endpoint | Publiczny endpoint nie jest objety rate limitingiem i renderuje user input w HTML maila bez escapingu. | Dodac limit, escapowac HTML, opcjonalnie captcha/honeypot.                                       |
| P1        | Observability    | Backend Sentry zalezy od env; local compose pokazuje pusty `SENTRY_DSN`.                               | Wymagac DSN w prod albo jawnie zaakceptowac tryb bez Sentry.                                     |
| P2        | Strapi build     | Build wypisuje ostrzezenia `Config file not loaded ... *.d.ts`.                                        | Usunac generowane `.d.ts` z katalogu config albo dostosowac output typecheck.                    |
| P2        | Warstwa danych   | W kilku kontrolerach jest bezposrednie `strapi.db.query`.                                              | W nowych zmianach preferowac Document Service/entity service i serwisy domenowe.                 |

## 5. Frontend Angular

### Mocne strony

| Obszar                 | Ocena                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| Angular                | Angular 21, SSR, hydration i route lazy loading sa skonfigurowane.                                  |
| Build                  | `frontend:build:production` przechodzi.                                                             |
| Typecheck              | `frontend:typecheck` przechodzi.                                                                    |
| Unit tests             | `frontend:test` przechodzi: 47 plikow, 207 testow.                                                  |
| Core services coverage | `frontend/src/app/core/services` ma ok. 95% statements i lines.                                     |
| SEO foundation         | Jest `SeoService`, dynamiczny SSR `sitemap.xml`, `robots.txt` i canonical/json-ld w czesci widokow. |
| PWA foundation         | Jest `manifest.webmanifest`, ale nie ma service workera.                                            |

### Ryzyka i braki

| Priorytet | Obszar          | Ustalenie                                                                                                         | Rekomendacja                                                                             |
| --------- | --------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| P0        | Error tracking  | Brak `@sentry/angular` i inicjalizacji w `app.config.ts`.                                                         | Dodac Sentry SDK i konfiguracje per env.                                                 |
| P1        | Global coverage | `frontend:test` ma 75.32% statements i 76.73% lines, ponizej celu 95%.                                            | Ustalic realny prog startowy, np. 80/85%, i oddzielic coverage bibliotek od aplikacji.   |
| P1        | Lint            | `frontend:lint` ma 2 bledy.                                                                                       | Zamienic `@ts-ignore` na `@ts-expect-error`, potem wyczyscic ostrzezenia.                |
| P1        | SEO             | `BlogList` i `AccountPanel` nie wywoluja `SeoService`.                                                            | Dodac meta title/description/canonical dla tych widokow.                                 |
| P1        | SEO             | `SeoService` ma default image `https://star-sign.app/...`, a produkcyjny siteUrl to `https://star-sign.pl`.       | Przeniesc OG image do environment i uzyc realnego assetu.                                |
| P1        | Analytics       | GA ID jest placeholderem `G-XXXXXXXXXX` w `App`; e-commerce events nie uzywaja standardowych nazw GA4.            | Przeniesc GA ID do env, dodac `add_to_cart`, `begin_checkout`, `purchase`, `view_item`.  |
| P1        | E2E             | `frontend-e2e:e2e` nie wystartowalo, bo port 4200 byl zajety.                                                     | Uniezaleznic E2E od stalego portu albo wymusic czyszczenie/reuse sprawnego serwera w CI. |
| P2        | Reactive forms  | Auth template uzywa `[disabled]` z reactive form controls; poprzednie logi pokazywaly ostrzezenia Angulara.       | Przeniesc disabled state do form controls albo sterowac przez `enable()/disable()`.      |
| P2        | PWA             | Manifest istnieje, ale brak service worker/offline.                                                               | Jesli PWA jest celem, dodac `@angular/service-worker` i `ngsw-config.json`.              |
| P2        | Breadcrumbs     | Aktualny coverage jest dobry, ale kod uzywa `any`, importuje nieuzywany `computed` i bierze pierwsze child route. | Utypowac `ActivatedRouteSnapshot` i dolozyc test dla wielu children.                     |

## 6. Testy i Coverage

Aktualne wyniki:

| Target             | Wynik                | Coverage                                                              |
| ------------------ | -------------------- | --------------------------------------------------------------------- |
| `cart:test`        | PASS, 15/15 testow   | 100% statements, 88.88% branches, 100% functions, 100% lines.         |
| `frontend:test`    | PASS, 207/207 testow | 75.32% statements, 76.9% branches, 66.11% functions, 76.73% lines.    |
| `frontend-e2e:e2e` | FAIL przed testami   | Brak wyniku testow, webServer nie wystartowal przez zajety port 4200. |

Najslabsze obszary w globalnym `frontend:test`:

| Obszar                                                     | Problem                                                                                        |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `frontend/src/app/app.ts`                                  | 37.5% lines, niewystarczajace testy checkout/cart init.                                        |
| `notification-toast.ts`                                    | 30% lines.                                                                                     |
| `cookie-banner.html`                                       | 27.58% lines.                                                                                  |
| `account/panel`                                            | Ok. 72% lines, a jest to krytyczny widok uzytkownika.                                          |
| `blog-detail`, `blog-list`, `home`, `numerology` templates | Niskie coverage template branches.                                                             |
| `libs/frontend/cart` w `frontend:test`                     | Niskie, mimo ze dedykowany `cart:test` ma 100%; wymaga korekty strategii coverage aggregation. |

Rekomendacja:

- Na start produkcji przyjac minimalny gate globalny 80% statements/lines i 70% functions, a docelowo podnosic do 90%+.
- Dla logiki biznesowej utrzymac osobny gate 90-95%, bo core services juz sa blisko.
- Nie mieszac coverage aplikacji i bibliotek bez swiadomego merge/ignore, bo daje sprzeczne wyniki dla `cart`.
- Dodac E2E smoke test w CI po buildzie SSR z mock API i stabilnym portem.

## 7. SEO, PWA i Content Delivery

Stan:

| Element       | Status                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| `robots.txt`  | Obslugiwany statycznie i dynamicznie w SSR server.                                                           |
| `sitemap.xml` | SSR server generuje dynamiczne wpisy dla statycznych tras, artykulow, znakow i produktow, gdy API odpowiada. |
| Meta tags     | `SeoService` istnieje i jest uzyty w wielu widokach, ale nie wszedzie.                                       |
| Canonical     | Obslugiwany w `SeoService`, ale wymaga pelnego wdrozenia per route.                                          |
| OG image      | Placeholder na domenie `star-sign.app`, niespojny z `star-sign.pl`.                                          |
| PWA           | Manifest jest, service worker/offline nie ma.                                                                |
| Cache         | Brak warstwy cache API i brak jawnych cache headers/CDN strategy dla najciezszych odczytow.                  |

## 8. CI/CD i Operacje

Aktualny CI:

| Job                    | Zakres                                     | Luka                                            |
| ---------------------- | ------------------------------------------ | ----------------------------------------------- |
| `main`                 | `npm ci`, `nx run-many -t build,typecheck` | Nie uruchamia lint, unit testow, e2e ani audit. |
| `aico-quality`         | Lint/test/verify pluginu AICO              | Nie obejmuje calego API/frontendu.              |
| `aico-predeploy-audit` | Manualny predeploy audit pluginu           | Dobry dodatek, ale nie zastepuje release gate.  |

Wymagane przed produkcja:

- Dodac do CI `nx run-many -t lint,test --projects=frontend,cart,@org/types,api` z akceptowalnymi progami.
- Dodac E2E smoke test z mock API albo staging API.
- Dodac `npm audit --audit-level=high` co najmniej dla produkcyjnych zaleznosci.
- Dodac `docker compose config` validation dla profilu prod.
- Dodac release checklist z potwierdzeniem env, migracji DB, backupu i rollbacku.

## 9. Finalna Roadmapa do Startu

### Faza 1: Must Fix przed jakimkolwiek publicznym startem

| Status | Zadanie                                                                           | Priorytet |
| ------ | --------------------------------------------------------------------------------- | --------- |
| [x]    | Redis-backed rate limiter, bez spoofowalnego `x-forwarded-for`, z `/api/contact`. | P0        |
| [x]    | Runtime env validation dla produkcji.                                             | P0        |
| [x]    | Usunac publiczne porty Postgres/Mailpit z produkcyjnego compose.                  | P0        |
| [x]    | Dodac frontend Sentry i wymagany env.                                             | P0        |
| [x]    | Zaktualizowac Strapi do 5.44.0 i ponowic audit/build/test.                        | P0/P1     |
| [x]    | Naprawic `frontend:lint` 2 bledy.                                                 | P1        |
| [x]    | Ustabilizowac `frontend-e2e:e2e` w CI.                                            | P1        |

### Faza 2: Stabilizacja jakości

| Status | Zadanie                                                                                                                                                         | Priorytet |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| [ ]    | Ustalic i wlaczyc progi coverage w CI.                                                                                                                          | P1        |
| [ ]    | Podniesc globalny frontend coverage do min. 80-85%, docelowo 90%+.                                                                                              | P1        |
| [ ]    | Dodac testy dla `App`, `account/panel`, cookie banner, notification toast.                                                                                      | P1        |
| [ ]    | Usunac warningi reactive forms w auth.                                                                                                                          | P2        |
| [ ]    | Wyczyscic najwazniejsze `any` w publicznych kontrolerach i pluginie AICO.                                                                                       | P2        |
| [ ]    | Dodać dodtkowe zabezpieczenia przed botami (formularz newslettera, i inne miejsca zagrożone atakiem bota ) google captcha lub inne popularne gotowe rozwiązanie |

### Faza 3: SEO, Analytics, Cache

| Status | Zadanie                                                                          | Priorytet |
| ------ | -------------------------------------------------------------------------------- | --------- |
| [ ]    | Dodac `SeoService` w `BlogList` i `AccountPanel`.                                | P1        |
| [ ]    | Poprawic OG image i canonical na `star-sign.pl`.                                 | P1        |
| [ ]    | Przeniesc GA4 ID do env i dodac standardowe eventy e-commerce.                   | P1        |
| [ ]    | Dodac cache/HTTP cache dla artykulow, horoskopow i znakow.                       | P1        |
| [ ]    | Dodac PWA service worker tylko jesli offline/PWA jest faktycznym celem produktu. | P2        |

### Faza 4: Operacje produkcyjne

| Status | Zadanie                                                                             | Priorytet |
| ------ | ----------------------------------------------------------------------------------- | --------- |
| [ ]    | Backup PostgreSQL i procedura restore test.                                         | P0        |
| [ ]    | Rotacja sekretow i potwierdzenie, ze realne tokeny nie trafily do repo/logow.       | P0        |
| [ ]    | Load test `k6`/Artillery dla horoskopow, artykulow, newslettera i checkout session. | P1        |
| [ ]    | Dashboard observability: Sentry, healthchecks, logi, alerty uptime.                 | P1        |
| [ ]    | Job sprzatajacy osierocone media w R2/S3 z dry-run.                                 | P2        |

## 10. Decyzja Audytowa

Decyzja: `NO-GO` dla produkcji publicznej w aktualnym stanie.

Uzasadnienie:

- Build i typecheck sa zielone, co potwierdza dobra baze techniczna.
- Unit testy frontendu i `cart` przechodza, ale coverage globalny frontendu jest za niski na deklarowane 95%.
- Lint gate nie przechodzi.
- E2E nie zostaly wykonane, bo webServer nie wystartowal.
- Rate limiting nie jest odporny na skale ani spoofing.
- Brakuje walidacji env i latwo uruchomic produkcje z lokalnymi/placeholderowymi wartosciami.
- Frontend nie ma error trackingu.
- Zaleznosci maja wysokie podatnosci.
- Domyslny compose publikuje porty, ktore nie powinny byc publiczne w produkcji.

Warunkowy `GO` mozna rozwazyc dopiero po zamknieciu wszystkich P0 i po zielonych komendach:

```bash
npm exec -- nx run-many -t typecheck,build --all
npm exec -- nx run-many -t lint --all
npm exec -- nx run cart:test --coverage --watch=false
npm exec -- nx run frontend:test --coverage --watch=false
npm exec -- nx run frontend-e2e:e2e
npm audit --audit-level=high
cd apps/api && npm audit --audit-level=high
```

## 11. Aktualizacja po implementacji Fazy 1

Data aktualizacji: 2026-05-01.

Status po Fazy 1: najwazniejsze blokery P0 z audytu zostaly zamkniete implementacyjnie, ale decyzja produkcyjna nadal wymaga domkniecia podatnosci `npm audit`, ustawienia realnych sekretow/DSN oraz decyzji o budzecie bundle.

### Zmiany wdrozone

| Obszar          | Wynik                                                                                                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rate limiting   | `global::rate-limit` uzywa Redis przez `ioredis`, ma wspolny key prefix, naglowki `X-RateLimit-*`, `Retry-After`, kontrolowany `failOpen`, domyslnie nie ufa `x-forwarded-for` i obejmuje `/api/contact`. |
| Env validation  | Dodano `apps/api/config/env-validation.ts` z fail-fast walidacja produkcji: sekrety, CORS bez localhost, DB bez SQLite, Redis dla rate limitera, R2/Stripe/Sentry wedlug flag.                            |
| Docker Compose  | Dodano Redis, API zalezy od Redis healthcheck, Postgres nie publikuje portu hosta, Mailpit i Stripe przeniesione do profilu `dev`, `docker compose config --quiet` przechodzi.                            |
| Frontend Sentry | Dodano `@sentry/angular`, `init()` przed bootstrapem, `ErrorHandler`, `TraceService` przez `provideAppInitializer`, konfiguracje env dev/prod.                                                            |
| E2E             | Domyslny Playwright smoke uzywa portu `4300`, Chromium, `workers=1`; pelna matryca mobile/WebKit jest opt-in przez `E2E_FULL_MATRIX=true`.                                                                |
| Contact E2E     | Mock API obsluguje `POST /api/contact`; formularz kontaktowy waliduje wymagane pola/email bez zaleznosci od niestabilnego `ngForm.valid` przy SSR/hydration.                                              |
| CI              | `main` workflow uruchamia teraz build/typecheck/lint dla `api`, `frontend`, `cart`, `@org/types`, typecheck/lint dla `frontend-e2e` oraz unit testy `frontend` i `cart`.                                  |
| Dependencies    | Backend Strapi podniesiony do 5.44.0; dodano `ioredis` 5.10.1, `zod` 4.4.1 i `@sentry/angular` 10.51.0.                                                                                                   |

### Walidacja po zmianach

| Komenda                                                                                                               | Wynik                                                  |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `npm exec -- nx run-many --targets=build,typecheck,lint --projects=api,frontend,cart,@org/types --outputStyle=static` | PASS, tylko warningi lint i warning budzetu frontendu. |
| `npm exec -- nx run-many --targets=typecheck,lint --projects=frontend-e2e --outputStyle=static`                       | PASS, tylko istniejace warningi Playwright lint.       |
| `npm exec -- nx run-many --target=test --projects=frontend,cart --outputStyle=static`                                 | PASS: `frontend` 207/207, `cart` 15/15.                |
| `npm exec -- nx run frontend-e2e:e2e --outputStyle=static`                                                            | PASS: 9/9 Chromium smoke.                              |
| `docker compose config --quiet`                                                                                       | PASS.                                                  |
| `npm audit --json`                                                                                                    | 43 podatnosci: 31 moderate, 12 high.                   |
| `npm audit --prefix apps/api --json`                                                                                  | 34 podatnosci: 2 low, 16 moderate, 16 high.            |

### Pozostale ryzyka po Fazie 1

- `npm audit` nadal pokazuje high vulnerabilities; Strapi upgrade zmniejszyl backend z 35 do 34 podatnosci, ale nie zamknal wszystkich high.
- Root Angular/Nx patch update do Angular 21.2.11 / Nx 22.7.1 wymaga osobnej migracji zaleznosci; `npm` nie rozwiazuje jej czysto bez wymuszania peer dependencies.
- Frontend production build przechodzi, ale initial bundle ma 593.06 kB przy budzecie 500 kB, czyli przekroczenie o 93.06 kB.
- Lint przechodzi jako gate, ale pozostaje duzo warningow `any`/unused w testach i pluginie AICO.
- Sentry frontend jest technicznie podlaczone, ale realny `SENTRY_DSN` nadal musi zostac ustawiony w produkcyjnym pipeline/build env.
- WebKit/mobile E2E nie jest domyslnym gate; do pelnej matrycy trzeba zainstalowac przegladarki Playwright i uruchomic `E2E_FULL_MATRIX=true npm exec -- nx run frontend-e2e:e2e`.
