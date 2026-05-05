# Serena context

Data: 2026-05-05

## Odczytane memory

- `project/production_env_generation_2026_05_05`

## Kontekst z kodu

- `deploy-production.yml` uruchamial po deployu smoke, headers, Playwright e2e oraz AICO preflight wymagajacy `AICO_AUDIT_BEARER`.
- AICO audit endpoint w pluginie jest admin route chroniony przez `admin::isAuthenticatedAdmin` i permission `plugin::ai-content-orchestrator.run-audit`, wiec losowy sekret GitHub Actions nie jest poprawnym modelem autoryzacji.
- Lokalny `.env.production.generated` jest ignorowany przez git i sluzy tylko do bezpiecznego przeklejenia do GitHub/Portainer.

## Wnioski

- Publiczny `GA4_MEASUREMENT_ID=G-5T6LZEVYVZ` mozna wpisac do wygenerowanego env.
- `AICO_AUDIT_BEARER` nalezy usunac z automatycznego deploya, poniewaz blokuje release i nie pasuje do aktualnego modelu admin auth.
- AICO strict audit pozostaje recznym checkiem w panelu Strapi.

## Podsumowanie po polsku

Serena potwierdza aktualna decyzje: deploy produkcyjny ma przechodzic bez tokenu AICO audit, a gotowosc AICO jest weryfikowana recznie w Strapi Admin przed wlaczeniem autonomicznych workflow.
