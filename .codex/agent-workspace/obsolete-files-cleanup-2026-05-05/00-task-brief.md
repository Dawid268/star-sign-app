# Obsolete files cleanup 2026-05-05

## Klasyfikacja

Średnie zadanie porządkowe z operacjami destrukcyjnymi.

## Cel

Usunąć pliki i katalogi, które są już nieaktualne albo lokalnie zbędne, bez naruszania aktywnych zmian funkcjonalnych.

## Zakres zaakceptowany do usunięcia

- Stare katalogi `.codex/agent-workspace/*` jako tymczasowe artefakty pracy agentów.
- `docs/production-readiness-audit-2026-05-01.md`, ponieważ sam dokument wskazuje, że jest historyczny i zastąpiony raportem z 2026-05-04.
- `apps/api/.tmp/`, ponieważ jest ignorowanym lokalnym katalogiem tymczasowym z bazą `data.db`.

## Poza zakresem

- Aktualne README, AGENTS, CLAUDE i dokumenty operacyjne.
- Źródła aplikacji, content type'y, endpointy i aktywne zmiany AICO.
- `docs/production-readiness-audit-2026-05-04.md`, bo nadal jest najnowszym tracked raportem produkcyjnym w `docs/`.
