# Refinement

## Co rozwiązujemy

Potrzebna jest jasna decyzja, czy aktualny stan projektu nadaje się do produkcji, oraz lista konkretnych prac wymaganych przed deploymentem.

## Najmniejsza wartościowa wersja

Deployment na środowisko staging lub produkcję z aktywnym maintenance mode, bez publicznego ruchu i bez paid Premium, pod warunkiem kompletnej konfiguracji środowiska i zielonego CI.

## Kryteria akceptacji publicznej produkcji

- Czysty zakres zmian i zaakceptowany PR lub commit set.
- Zielony CI z czystego checkoutu.
- `apps/api` vulnerability audit naprawiony albo formalnie zaakceptowany z planem remediacji.
- `api:premium-content-audit`, `api:aico-contract-audit` i `ai-content-orchestrator:audit:preflight:ci` przechodzą na stagingu.
- Produkcyjne sekrety i zmienne środowiskowe są kompletne, bez placeholderów.
- Smoke testy staging/live obejmują maintenance, app settings, Premium open, auth, contact, newsletter, analytics i główne ścieżki contentowe.
- Monitoring, backup i restore są potwierdzone.

## Edge cases

- Publiczny endpoint app settings niedostępny: frontend powinien fallbackować do `maintenance=false` i `premium=open`.
- Maintenance mode włączony: użytkownik nie powinien widzieć nawigacji, koszyka, cookie banneru ani części aplikacji, poza dozwolonymi ścieżkami.
- `premium_mode=open` i `stripe_checkout_enabled=true`: checkout nie może wystartować.
- Brak Redis rate limit w production: env validation powinien blokować lub wymagać świadomej konfiguracji.
- AICO bez tokenu preflight: nie uznawać pluginu za gotowy do produkcji.

## Co nie wchodzi teraz w zakres

- Naprawianie wszystkich znalezionych problemów w tym audycie.
- Live testy Stripe, GA4 i produkcji bez osobnej autoryzacji.
- Uruchamianie autonomicznych publikacji social.

## Polska konkluzja

Zakres następnego kroku powinien być operacyjny: przygotować staging/production behind maintenance, uzupełnić sekrety, naprawić podatności albo udokumentować wyjątek, uruchomić brakujące audyty i zebrać dowody. Dopiero potem zdejmować maintenance dla ruchu publicznego.
