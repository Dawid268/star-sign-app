# QA Report

## Co zweryfikowano

- Składnia shell:
  - `rtk sh -n ops/predeploy-check.sh`: PASS
  - `rtk sh -n ops/production-env-check.sh`: PASS
- YAML parse:
  - `.github/workflows/ci.yml`: PASS
  - `.github/workflows/deploy-production.yml`: PASS
  - `ops/portainer/star-sign-production-stack.yml`: PASS
- Portainer stack:
  - `rtk docker compose -f ops/portainer/star-sign-production-stack.yml --env-file .env.example config --quiet`: PASS
- Local predeploy:
  - `rtk npm run ops:predeploy:local`: PASS
- CI target checks:
  - `rtk npm exec -- nx run frontend:test --configuration=coverage --outputStyle=static`: PASS, 338 tests, coverage thresholds passed.
  - `rtk npm exec -- nx run-many -t build --projects=frontend,api,cart,@org/types --outputStyle=static`: PASS.
- Env guard:
  - `rtk env PRODUCTION_ENV_FILE=.env.example sh ops/production-env-check.sh`: oczekiwany FAIL, 48 placeholder/test-secret issues, bez wypisywania wartości sekretów.
- Whitespace:
  - `rtk git diff --check`: PASS.
- Dokumentacja Portainer:
  - `ops/portainer/README.md`: rozszerzona do 573 linii instrukcji operacyjnej.
  - Sprawdzono obecność sekcji dla GitHub secrets, GitHub variables, zmiennych Portainera, GHCR, Traefika, R2/media, pierwszego deployu, rollbacku i troubleshooting.
  - `rtk rg -n "STAR_SIGN_PRODUCTION_ENV|PORTAINER_WEBHOOK_URL|AICO_AUDIT_BEARER|FRONTEND_BASE_URL|API_BASE_URL|R2_UPLOAD_ENABLED|REDIS_PASSWORD|STRIPE_REQUIRED" ops/portainer/README.md`: PASS.
- Polityka concurrency CI/CD:
  - Wszystkie workflowy w `.github/workflows/*.yml` mają blok `concurrency`.
  - Wszystkie workflowy mają `cancel-in-progress: true`.
  - `rtk node -e "...YAML.parse..."`: PASS dla wszystkich workflowów.
  - `rtk rg -n "^concurrency:|group:|cancel-in-progress" .github/workflows -g '*.yml' -g '*.yaml'`: PASS.

## Ograniczenia

- Nie uruchomiono GitHub Actions, bo wymaga sekretów `STAR_SIGN_PRODUCTION_ENV`, `PORTAINER_WEBHOOK_URL` i `AICO_AUDIT_BEARER`.
- Nie wywołano Portainer webhooka.
- Nie wykonano live smoke/e2e na domenach.
- Trivy scan jest w workflow jako report-only przez `continue-on-error`, żeby pierwszy deploy nie został zablokowany przez nieznane CVE obrazu bazowego bez wcześniejszej klasyfikacji.
- Nie walidowano realnych wartości produkcyjnych w Portainerze, bo nie wolno wpisywać sekretów do repo ani workspace.

## Polska konkluzja

Implementacja jest lokalnie spójna: stack Portainer parsuje się, bramy shell działają, główne targety CI przechodzą, a README zawiera kompletną instrukcję konfiguracji GitHub Actions i Portainera. Pełny dowód produkcyjny wymaga skonfigurowanych sekretów GitHub/Portainer i pierwszego uruchomienia workflow na `main`.
