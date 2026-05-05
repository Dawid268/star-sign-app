# Decision Log

## Decision: Public production remains NO-GO

Date: 2026-05-05
Agents involved: Product Owner, Virtual User, Designer, System Architect, QA

### Context

Lokalne testy są w większości zielone, ale dependency audit API pokazuje 27 podatności produkcyjnych, audyty domenowe nie przeszły przez brak bazy, a AICO preflight wymaga tokenu.

### Decision

Nie rekomendować publicznego deploymentu produkcyjnego ani zdjęcia maintenance mode.

### Alternatives considered

- Publiczny soft launch natychmiast.
- Deployment wyłącznie za maintenance mode.

### Rationale

Publiczny launch bez dowodów staging/live i z otwartymi P0 zwiększa ryzyko techniczne, bezpieczeństwa i reputacyjne.

### Consequences

Należy domknąć P0, zebrać dowody i dopiero wtedy wrócić do decyzji go/no-go.

### Polish summary

Publiczna produkcja pozostaje NO-GO do czasu zamknięcia blokujących audytów, podatności i testów środowiskowych.

## Decision: Maintenance deployment can be conditional

Date: 2026-05-05
Agents involved: Product Owner, System Architect, Designer, QA

### Context

Maintenance mode jest wdrożony i przetestowany lokalnie oraz w e2e. Pozwala ukryć aplikację przed użytkownikiem w trakcie prac.

### Decision

Dopuścić staging albo techniczny deployment produkcyjny za `maintenance_mode_enabled=true` jako krok przygotowawczy.

### Alternatives considered

- Blokada każdego deploymentu.
- Publiczny launch bez maintenance.

### Rationale

Deployment za maintenance pozwala sprawdzić środowisko, domenę, konfigurację i monitoring bez ryzyka publicznego UX.

### Consequences

Trzeba uważać, żeby nie traktować tego jako zgody na publiczny ruch albo paid Premium.

### Polish summary

Deployment za maintenance mode jest rozsądny jako etap techniczny, ale nie oznacza gotowości do publicznego launchu.

## Decision: Paid Premium requires separate go/no-go

Date: 2026-05-05
Agents involved: Product Owner, System Architect, QA

### Context

Premium open jest bezpieczne funkcjonalnie, ale paid Premium dodaje Stripe checkout, webhook, portal, sukces/cancel i ryzyka płatnicze.

### Decision

Paid Premium nie wchodzi w ten sam werdykt co open Premium. Wymaga osobnej decyzji po testach Stripe i konfiguracji live/test.

### Alternatives considered

- Włączyć paid Premium razem z publicznym startem.
- Pozostać przy `premium_mode=open` do czasu pełnych dowodów.

### Rationale

Płatności są obszarem wysokiego ryzyka i wymagają osobnego zestawu dowodów.

### Consequences

Soft launch może działać w open Premium, ale płatności zostają wyłączone do osobnego readiness check.

### Polish summary

Paid Premium ma osobny NO-GO do czasu pełnego Stripe readiness.
