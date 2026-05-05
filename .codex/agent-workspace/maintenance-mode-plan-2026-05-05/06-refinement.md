# Refinement

## Co rozwiązujemy?

Możliwość czasowego pokazania użytkownikom strony „pracujemy nad serwisem” bez deployowania osobnej wersji frontendu.

## Kto używa?

- Operator włącza flagę w Strapi `App Settings`.
- Gość widzi estetyczny komunikat.
- Developer nadal może testować przez wyjątki albo lokalny env.

## MVP

1. Dodać pola maintenance do `App Settings`.
2. Rozszerzyć publiczny kontrakt API.
3. Rozszerzyć shared types i frontend service.
4. Dodać komponent `MaintenanceMode`.
5. Warunkowo renderować go w root `App`.
6. Dodać testy API, service, root shell i komponentu.

## Business rules

- Backend decyduje, czy tryb jest aktywny.
- Fallback przy błędzie API: aplikacja działa normalnie.
- Tryb prac nie ujawnia sekretów ani powodów operacyjnych.
- Wyjątki muszą być jawne i ograniczone.
- Normalne CTA checkout/premium nie są widoczne w trybie prac.

## Edge cases

- API timeout: normalna aplikacja.
- `maintenance_eta` w przeszłości: nie pokazywać albo pokazać bez etykiety „planowany”.
- Pusty title/message: fallback do domyślnego tekstu.
- Nieprawidłowy contact URL: ignorować.
- Ścieżka z query param: porównywać tylko pathname.
- SSR: initial render może pokazać krótki checking state, potem właściwy widok.

## Narzędzia

- Serena: kontekst i zapis decyzji.
- Nx: `frontend`, `api`, `@org/types`.
- Angular unit tests.
- API Vitest.
- Playwright e2e dla globalnego widoku.

## Polska konkluzja

Zakres MVP jest jasny i ma niski koszt: rozszerzamy istniejący system ustawień, dodajemy jeden globalny komponent i testujemy zachowanie włączonego oraz wyłączonego trybu.
