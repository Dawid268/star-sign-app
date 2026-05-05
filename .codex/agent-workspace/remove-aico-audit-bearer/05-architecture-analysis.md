# Architecture analysis

## Stan przed zmiana

Pipeline produkcyjny mial dwa modele naraz:

- Strapi admin route wymaga admin auth i RBAC `run-audit`.
- GitHub Actions oczekiwal stalego `AICO_AUDIT_BEARER`, ktory nie mial osobnego mechanizmu service-token w API.

## Problem

Losowo wygenerowany bearer w GitHub nie bylby akceptowany przez aplikacje. Poprawny service-token wymagalby osobnej implementacji po stronie API, hash storage i ograniczenia scope do jednego endpointu.

## Decyzja

Na ten etap usunac remote AICO preflight z CI/CD. Nie implementowac polowicznego service-tokena. Deploy ma byc blokowany przez standardowe gate'y: env guard, dependency audit, lint, typecheck, testy, build, smoke, headers i e2e.

## Konsekwencje

- Mniej blokad i mniej sekretow w GitHub Actions.
- AICO strict audit trzeba wykonac recznie w panelu Strapi, gdy wlaczamy autonomiczne workflow.
- Jesli kiedys audit ma znow byc automatyczny, trzeba zrobic poprawny service-token zamiast improwizowanego bearer secret.

## Informacja zwrotna po CI

Po pushu do `main` produkcyjny workflow przeszedl release gate, ale Docker build API obrazu wykazal brak `dist/admin/index.mjs` lokalnego pluginu AICO w kontenerze. Przyczyna: Dockerfile uruchamial `api:build` przed zbudowaniem `ai-content-orchestrator:build`. Naprawa: Dockerfile buduje plugin AICO przed `api:build`.

## Podsumowanie po polsku

Architektonicznie lepiej usunac wadliwy gate niz udawac, ze dowolny bearer token zabezpiecza adminowy endpoint. Obecna zmiana jest prostsza i bezpieczniejsza dla pierwszego deploya.
