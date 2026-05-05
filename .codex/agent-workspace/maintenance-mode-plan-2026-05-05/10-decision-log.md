# Decision log

## Decision: Maintenance mode przez App Settings

Date: 2026-05-05
Agents involved: PO, Virtual User, Designer, Architect, Developer, QA

### Context

Projekt ma już publiczny endpoint ustawień aplikacji używany przez Premium. Użytkownik chce sterować trybem prac z API i pokazać klientowi kosmiczny widok informacyjny.

### Decision

Rozszerzamy istniejący `App Settings` i `GET /api/app-settings/public` o `maintenanceMode`. Frontend renderuje globalny widok w root shellu.

### Alternatives considered

- Osobny endpoint `/api/site-status`.
- Guard na każdej trasie.
- Middleware SSR.

### Rationale

Istniejący mechanizm jest już przetestowany, bezsekretowy i ma fallback. Root shell minimalizuje liczbę zmian w routingu.

### Consequences

Tryb prac jest kontrolowany z API, ale pierwsza decyzja nadal zależy od pobrania ustawień przez frontend. To akceptowalne dla MVP.

### Polish summary

Najmniejszy bezpieczny wariant to rozbudowa App Settings i jeden globalny widok maintenance w Angularze.
