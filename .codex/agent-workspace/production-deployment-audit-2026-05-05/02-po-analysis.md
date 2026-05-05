# Product Owner / Business Analyst Analysis

## Problem biznesowy

Star Sign ma być gotowy do publikacji produkcyjnej, ale aplikacja zawiera równolegle wiele nowych obszarów: Premium, App Settings, maintenance mode, AICO plugin, analytics i social automation. Ryzykiem nie jest pojedynczy błąd funkcjonalny, tylko brak pełnego, powtarzalnego dowodu, że całość jest bezpieczna i stabilna na prawdziwym środowisku.

## Użytkownicy

- Nowy użytkownik publiczny, który wchodzi z social media albo SEO.
- Użytkownik zainteresowany Premium.
- Administrator/operator treści i AICO.
- Właściciel produktu podejmujący decyzję o soft launchu albo paid Premium.

## Wartość biznesowa obecnego stanu

- Maintenance mode daje bezpieczny bufor na deployment techniczny bez publicznego ryzyka UX.
- `premium_mode=open` pozwala soft launchować wartość Premium bez ryzyka płatności.
- AICO jest bliżej enterprise readiness, ale wymaga jeszcze dowodów preflight i środowiskowych.

## Must-have przed publiczną produkcją

- Czysty, zrecenzowany zakres zmian i CI z czystego checkoutu.
- Naprawa albo jawna akceptacja 27 podatności produkcyjnych w `apps/api`, szczególnie 1 high.
- Zielone domenowe audyty Premium i AICO na realnej/stagingowej bazie.
- Zielony AICO preflight z realnym tokenem audytowym.
- Smoke testy staging/live dla App Settings, maintenance, Premium open, checkout disabled/open, GA4 i Stripe test/live bez realnych transakcji poza zaakceptowanym scenariuszem.
- Produkcyjne sekrety i konfiguracja bez placeholderów.

## Should-have

- CSP, frame policy i Permissions-Policy w warstwie edge/proxy.
- Potwierdzony restore backupu.
- Potwierdzony monitoring błędów i alerting.
- Decyzja o ryzyku JWT w `localStorage`.
- Redukcja lint warningów w AICO/frontend.

## Could-have

- Mobile/WebKit full matrix przed soft launchem.
- Semgrep albo równoważny SAST w CI.
- Raport Lighthouse po stagingu.

## Out of scope teraz

- Live publikacja social przez AICO.
- Live Stripe charge bez osobnej autoryzacji.
- Live GA4 validation poza pasywną weryfikacją konfiguracji.

## Polska konkluzja

Z biznesowego punktu widzenia można rozważyć techniczny deployment za maintenance mode, ale nie publiczny launch. Publiczny ruch i paid Premium wymagają zamknięcia dowodów bezpieczeństwa, płatności, analityki i audytów domenowych.
