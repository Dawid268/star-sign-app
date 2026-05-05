# PO Analysis

## Wartość biznesowa

Deploy z `main` ma być powtarzalny, przewidywalny i zgodny z istniejącym sposobem pracy na VPS: GitHub Actions buduje obrazy, GHCR je przechowuje, a Portainer aktualizuje stack.

## Wymagania must-have

- Każdy branch i PR uruchamia jakość: lint, typecheck, unit tests i build.
- `main` buduje i publikuje obrazy API/frontend oraz wywołuje Portainer webhook.
- Po deployu wykonywane są smoke, security headers i Playwright e2e na domenie.
- Media produkcyjne po deployu są dostępne z Cloudflare R2/CDN.
- VPS 2 vCPU / 4 GB nie może zostać zdominowany przez Star Sign.

## Ryzyka

- Same pliki w R2 nie wystarczą, jeśli baza Strapi nie ma rekordów `upload_file`.
- E2E przeciw live domenie korzysta z obecnych testów mockujących API po stronie Playwright, więc jest głównie UI smoke, nie pełnym testem danych produkcyjnych.
- Portainer webhook wymaga poprawnego sekretu i dostępu GHCR do prywatnych obrazów.

## Polska konkluzja

Zakres wdrożenia jest jasny: automatyzujemy release path, ale nie wykonujemy realnego deployu ani nie konfigurujemy sekretów za użytkownika.
