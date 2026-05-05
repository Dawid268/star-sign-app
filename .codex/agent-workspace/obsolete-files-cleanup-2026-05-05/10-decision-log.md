# Decision log

## Decision: Usuwamy tylko jawnie nieaktualne artefakty

Date: 2026-05-05
Agents involved: PO, Virtual User, Architect, Developer, QA

### Context

Użytkownik poprosił o usunięcie zbędnych Markdownów i reszty nieaktualnych plików.

### Decision

Kasujemy stare workspace'y agentów, historyczny raport z 2026-05-01 oraz lokalny `.tmp`. Nie kasujemy aktualnych README, runbooków, checklist ani raportu z 2026-05-04.

### Alternatives considered

- Usunąć wszystkie Markdowny poza README.
- Usunąć cały katalog `docs/`.
- Zostawić wszystko i tylko oznaczyć jako archiwalne.

### Rationale

Selektwyny cleanup usuwa szum bez ryzyka utraty dokumentacji operacyjnej albo aktualnych decyzji.

### Consequences

Historia roboczych agentów znika z repo, ale reusable knowledge pozostaje w Serenie i bieżącym raporcie cleanupu.

### Polish summary

Usuwamy pliki z jasnym statusem starego artefaktu, nie dokumentację potrzebną do pracy.
