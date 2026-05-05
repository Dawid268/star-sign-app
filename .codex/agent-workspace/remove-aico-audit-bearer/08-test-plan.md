# Test plan

## Zakres walidacji

- Sprawdzic, ze w repo nie ma juz `AICO_AUDIT_BEARER`, `RUN_AICO_PREFLIGHT`, workflow `AICO Predeploy Audit` ani targetu `audit:preflight:ci`.
- Sprawdzic skladnie shell scripts i JSON.
- Sprawdzic YAML workflow.
- Sprawdzic `production-env-check` na `.env.production.generated`.
- Sprawdzic compose config Portainera na `.env.production.generated`.
- Sprawdzic Nx sync i AICO verify po usunieciu skryptu z package.json.

## Podsumowanie po polsku

Testy skupiaja sie na tym, czy deploy pipeline przestal zalezec od AICO bearer i czy pozostale gate'y nadal sa poprawnie skonfigurowane.
