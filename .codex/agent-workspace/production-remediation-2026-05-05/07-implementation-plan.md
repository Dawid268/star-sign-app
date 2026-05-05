# Implementation Plan

1. Zaktualizować `apps/api/package.json` override dla `axios`.
2. Odświeżyć `apps/api/package-lock.json` przez npm w katalogu API.
3. Dodać helper SQLite do skryptów audytu.
4. Wpiąć helper w `premium-content-audit.js` i `aico-contract-audit.js`.
5. Zaktualizować `ops/Caddyfile`.
6. Zaktualizować `docker-compose.yml`.
7. Rozszerzyć `ops/smoke.sh`.
8. Uruchomić walidacje i zapisać QA.
9. Dodać powtarzalny `ops:predeploy:local`, który rozdziela lokalne checki od stagingowych wymagań DB/tokenów.
10. Dodać security headers check dla staging/edge i wpiąć go w predeploy staging.
11. Dodać statyczny production env guard i wpiąć go w predeploy staging.

## Polska konkluzja

Zmiany są ograniczone do dependency/config/ops i nie dotykają logiki użytkownika ani live providerów.
