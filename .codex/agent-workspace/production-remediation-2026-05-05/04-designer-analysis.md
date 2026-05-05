# Designer Analysis

## Wpływ UX

Brak bezpośredniej zmiany layoutu. Smoke test zostaje rozszerzony o App Settings, co pośrednio chroni maintenance mode i Premium UX.

## Ryzyka

- Zbyt restrykcyjny CSP mógłby zepsuć Strapi admin, GA4, Turnstile albo frontend. Dlatego rekomendowana zmiana CSP jest minimalna i skupiona na `frame-ancestors`, `base-uri` i `object-src`.

## Polska konkluzja

Zmiany nie powinny zmienić wyglądu aplikacji. Minimalne CSP i Permissions-Policy są bezpieczniejsze niż agresywny CSP wdrożony bez screenshotów stagingowych.
