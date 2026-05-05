# PO analysis

## Problem

Właściciel projektu potrzebuje szybkiego przełącznika, który pozwala ukryć publiczną aplikację podczas prac, bez deployowania specjalnej wersji frontendu.

## Użytkownicy

- Właściciel/operator strony: chce włączyć tryb prac z API lub panelu Strapi.
- Gość strony: powinien dostać jasny, estetyczny komunikat zamiast błędów albo niedokończonych sekcji.
- Administrator/developer: musi mieć możliwość testowania aplikacji mimo aktywnego trybu.

## Wartość

- Bezpieczniejsze prace przed launch lub podczas awarii.
- Spójny komunikat marki zamiast przypadkowych błędów.
- Możliwość przygotowania kampanii lub release bez wystawiania niedokończonej strony.

## Must-have

- Flaga w API: `maintenanceModeEnabled`.
- Publiczny status w `GET /api/app-settings/public`.
- Frontend pokazuje pełnoekranowy widok „Pracujemy nad stroną”.
- Możliwość ustawienia tytułu, tekstu i opcjonalnego ETA.
- Fallback bezpieczny: jeśli API nie odpowiada, domyślnie nie blokujemy strony w produkcji.
- Admin/API health nie mogą zostać zablokowane.

## Should-have

- Lista ścieżek wyłączonych z blokady: legal, cookies, newsletter unsubscribe/confirm, health.
- Krótki komunikat kontaktowy albo link do social media.
- Event analytics `maintenance_mode_view`, jeśli analytics jest aktywne.

## Could-have

- Osobny kod bypass dla admina lub preview, np. query param z tokenem.
- Harmonogram automatycznego włączenia/wyłączenia.
- Tryb częściowy tylko dla checkout, bloga albo Premium.

## Not now

- Nie budować osobnego CMS page buildera.
- Nie dodawać nowej usługi ani zewnętrznego feature flag providera.
- Nie blokować Strapi admina.

## Acceptance criteria

- Operator może włączyć tryb przez `App Settings`.
- Publiczny endpoint nie ujawnia sekretów.
- Gość widzi kosmiczny ekran prac zamiast normalnej aplikacji.
- Wyjątki techniczne i prawne działają.
- Testy API i frontendowe potwierdzają fallback oraz włączony tryb.

## Polska konkluzja

Najmniejsza wartościowa wersja to globalny przełącznik w `App Settings` i jeden dopracowany, kosmiczny widok frontendowy.
