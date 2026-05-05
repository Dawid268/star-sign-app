# Virtual User Interview

## Perspektywa użytkownika

Użytkownik po deployu oczekuje, że strona działa bez przerw, obrazy i media są widoczne, a formularze i podstawowe ścieżki nie zwracają błędów.

## Krytyczne oczekiwania

- Strona `https://star-sign.pl` ładuje się przez Traefik z HTTPS.
- API pod `/api` i opcjonalnie `api.star-sign.pl` działa po deployu.
- Obrazy artykułów, tarot i AICO nie znikają po restarcie kontenera.
- Maintenance mode może zostać użyty jako bezpieczna osłona release.

## Polska konkluzja

Największe ryzyko użytkownika to brak mediów po deployu albo częściowo zaktualizowany frontend/API. R2 i osobne healthchecki minimalizują ten problem.
