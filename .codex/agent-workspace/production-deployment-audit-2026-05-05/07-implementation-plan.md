# Developer Remediation Plan

## Cel

Nie wdrażamy poprawek w ramach tego audytu. Ten plik porządkuje kolejność prac technicznych przed następną decyzją produkcyjną.

## Kolejność prac P0

1. Uporządkować working tree.
   - Oddzielić zmiany funkcjonalne od artefaktów audytowych.
   - Zweryfikować pliki usunięte i untracked.
   - Przygotować logiczne commity albo PR.

2. Zamknąć `apps/api` vulnerability audit.
   - Przejrzeć ścieżkę `axios` i zależności Strapi.
   - Sprawdzić dostępne aktualizacje Strapi i transitive dependencies.
   - Jeśli szybki upgrade nie jest możliwy, przygotować formalny risk acceptance z kompensacjami.

3. Przywrócić środowisko audytów domenowych.
   - Zapewnić lokalną albo stagingową bazę/katalog DB.
   - Uruchomić `api:premium-content-audit`.
   - Uruchomić `api:aico-contract-audit`.

4. Uruchomić AICO preflight.
   - Dostarczyć `AICO_AUDIT_BEARER` przez bezpieczny secret store.
   - Nie zapisywać tokenu w repo ani raportach.
   - Uruchomić `ai-content-orchestrator:audit:preflight:ci`.

5. Przeprowadzić staging smoke.
   - Maintenance mode.
   - Public app settings.
   - Premium open bez checkoutu.
   - Główne strony contentowe.
   - Auth, contact, newsletter, analytics.

## Kolejność prac P1

1. Produkcyjna konfiguracja observability.
   - Zastąpić placeholdery Bugsink/Sentry.
   - Potwierdzić event testowy i alert.

2. Security headers.
   - Dodać lub potwierdzić CSP.
   - Dodać frame policy przez `frame-ancestors` albo równoważną politykę.
   - Dodać Permissions-Policy dopasowaną do funkcji strony.

3. Rate limit i proxy.
   - Potwierdzić `trustProxy`.
   - Upewnić się, że Caddy nie pozwala spoofować `X-Forwarded-For`.
   - Sprawdzić Redis availability i fail behavior.

4. Auth token storage.
   - Podjąć decyzję: akceptacja ryzyka `localStorage` na MVP albo migracja do bezpieczniejszego modelu.

## Kolejność prac P2

1. Zredukować lint warnings.
2. Odświeżyć dokumentację production readiness.
3. Dodać mobile/WebKit full matrix przed szerszym ruchem.
4. Dodać SAST/secrets scan do CI, jeśli nie jest jeszcze aktywny.

## Polska konkluzja

Najpierw trzeba zamknąć rzeczy mierzalne: dependency audit API, audyty domenowe, AICO preflight i staging smoke. Dopiero potem warto inwestować czas w porządki P1/P2, chyba że któryś P1 blokuje politykę bezpieczeństwa środowiska.
