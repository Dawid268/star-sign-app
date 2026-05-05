# Designer analysis

## Kierunek wizualny

Nazwa robocza: **Cosmic Workshop**.

Estetyka: ciemny kosmos, subtelna mapa gwiazd, delikatna poświata księżyca albo horyzontu planety, bez kiczowatych gradientowych blobów. Ma wyglądać jak elegancka, astrologiczna plansza statusowa, nie landing page.

## Widok

- Pełny viewport.
- Brak standardowego navbaru, footera i koszyka w trybie pełnej blokady.
- Centralny komunikat z krótkim tytułem:
  - `Pracujemy nad Star Sign`
  - albo `Gwiazdy układają się na nowo`
- Tekst pomocniczy:
  - `Dopracowujemy stronę i wrócimy za chwilę.`
- Opcjonalny ETA:
  - `Planowany powrót: 5 maja, 18:00`
- Opcjonalny link:
  - `Kontakt`
  - `Instagram`

## Elementy UI

- Tło CSS: radialne gwiazdy, delikatna orbita, lekki shimmer.
- Jedna główna ilustracja lub CSS scene, bez stockowych zdjęć.
- Przyciski tylko, jeśli są realne linki.
- `prefers-reduced-motion`: wyłącza animacje ruchu gwiazd.
- Kontrast minimum WCAG AA.
- `aria-live="polite"` tylko dla statusu ładowania, nie dla całej sceny.

## Responsywność

- Mobile: tytuł 32-40 px, tekst 16-18 px, wszystkie elementy w jednej kolumnie.
- Desktop: wąski content max 680 px, dużo oddechu, scena kosmiczna pełnoekranowa.
- Widok ma działać offline po załadowaniu bundle, ale decyzja trybu pochodzi z API.

## Stany

- `checking`: krótki, neutralny skeleton albo mini status „Sprawdzamy status strony”.
- `enabled`: pełna plansza prac.
- `disabled`: normalna aplikacja.
- `api_error`: normalna aplikacja, bo fallback nie powinien przypadkowo wyłączyć strony.

## Polska konkluzja

To nie ma być zwykłe „under construction”. Widok powinien być markowy, spokojny i kosmiczny, ale lekki technicznie.
