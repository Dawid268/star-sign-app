# System Architect Analysis

## Decyzje techniczne

- Nie wykonywać automatycznej migracji Strapi z v5 do sugerowanej przez npm gałęzi v4. To byłby regres architektoniczny.
- Wymusić minimalny override `axios` do wersji nieobjętej high advisory w nested Strapi packages.
- Nie wymuszać globalnego override `uuid`, `vite` ani `elliptic`, bo może to złamać transitive API albo nadal nie mieć realnego fixed version.
- Nie tworzyć pustej lokalnej SQLite DB tylko po to, by audyty przechodziły. Brak bazy ma być kontrolowanym błędem.
- Caddy dostaje minimalny CSP defensywny, który nie blokuje skryptów admina i frontendu.

## Trade-off

Dependency audit API może nadal raportować umiarkowane transitive ryzyka Strapi. To wymaga osobnej decyzji: vendor update, formalna akceptacja ryzyka albo dodatkowe kompensacje.

## Polska konkluzja

Remediacja zamyka część P0/P1 bez ryzykownej migracji frameworka. Pozostałe podatności Strapi trzeba potraktować jako jawny dependency risk, nie ukrywać ich konfiguracją.
