# Maintenance mode plan 2026-05-05

## Klasyfikacja

Średnie zadanie produktowo-techniczne.

## Cel

Zaplanować przełącznik `maintenance / work in progress mode`, który można włączyć po stronie API, a użytkownik po stronie klienta zobaczy pełnoekranowy widok informujący, że trwają prace nad stroną. Widok ma pasować do Star Sign, z motywem gwiazd i kosmosu.

## Zakres planu

- Rozszerzenie Strapi `App Settings`.
- Publiczny, bezsekretowy kontrakt dla frontendu.
- Frontendowy shell, który blokuje normalne route'y i pokazuje widok zastępczy.
- Wyjątki dla stron prawnych i technicznych.
- Test plan API, UI i e2e.

## Założenie

To jest plan, nie implementacja. Nie zmieniamy jeszcze kodu funkcjonalnego poza dokumentacją planu.
