# Decision log

## Decision: Remove AICO bearer from production deploy

Date: 2026-05-05
Agents involved: Product Owner, Architect, Developer, QA

### Context

Produkcyjny workflow wymagal `AICO_AUDIT_BEARER`, ale backend AICO audit jest admin route chroniony przez Strapi admin auth i permission `run-audit`.

### Decision

Usuwamy `AICO_AUDIT_BEARER`, osobny workflow AICO predeploy audit i AICO preflight jako automatyczny hard gate deploya.

### Alternatives considered

- Dodac service-token do API.
- Uzywac admin JWT w GitHub Actions.
- Zostawic obecny gate i wymagac losowego bearer secret.

### Rationale

Service-token to osobna funkcja security i nie jest potrzebna do pierwszego deploya. Admin JWT w GitHub Actions bylby zlym modelem operacyjnym. Losowy bearer nie dziala z aktualna autoryzacja.

### Consequences

Deploy nie blokuje sie na AICO. AICO audit pozostaje reczny w Strapi Admin przed wlaczeniem autonomicznych workflow.

### Polish summary

Usuwamy wadliwy token z deploya. Jezeli automatyczny AICO audit bedzie potrzebny pozniej, trzeba wdrozyc poprawny, wasko zakresowy service-token.
