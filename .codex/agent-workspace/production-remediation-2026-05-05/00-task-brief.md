# Remediacja po audycie produkcyjnym

Data: 2026-05-05

## Cel

Wdrożyć lokalnie te poprawki z audytu produkcyjnego, które nie wymagają realnych sekretów, live Stripe, live GA4 ani aktywnych testów produkcji.

## Zakres

- Zmniejszyć ryzyko dependency audit API bez migracji Strapi do innej gałęzi.
- Poprawić operacyjne audyty domenowe, aby brak lokalnej bazy dawał jasny błąd.
- Wzmocnić nagłówki bezpieczeństwa na Caddy.
- Usunąć ciche fallbacki placeholderów Bugsink z Docker Compose.
- Rozszerzyć smoke test o publiczne App Settings i brak sekretów w odpowiedzi.

## Poza zakresem

- Live Stripe/GA4.
- AICO preflight bez `AICO_AUDIT_BEARER`.
- Realny staging smoke bez środowiska.
- Pełna migracja tokenów auth z `localStorage`.

## Polska konkluzja

Implementujemy konkretne lokalne poprawki readiness, ale po tej fazie nadal potrzebna będzie walidacja na stagingu i osobne decyzje dla paid Premium oraz AICO preflight.
