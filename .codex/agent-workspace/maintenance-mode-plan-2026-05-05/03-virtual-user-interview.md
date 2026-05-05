# Virtual user interview

## Symulowana rozmowa

**Użytkownik:** Wchodzę na stronę i widzę komunikat o pracach. Chcę wiedzieć, czy to awaria, czy planowane prace.

**Odpowiedź produktu:** Ekran powinien jasno mówić, że Star Sign jest aktualnie dopracowywany, a nie że coś się zepsuło.

**Użytkownik:** Czy mam wrócić później?

**Odpowiedź produktu:** Tak. Jeśli operator poda ETA, pokazujemy przewidywany powrót. Jeśli nie, używamy neutralnego komunikatu bez obietnicy czasu.

**Użytkownik:** Czy mogę skontaktować się z zespołem?

**Odpowiedź produktu:** W MVP można pokazać link do kontaktu albo social media, ale musi działać nawet, gdy większość route'ów jest ukryta.

## Oczekiwana ścieżka

1. Użytkownik otwiera dowolny publiczny URL.
2. Aplikacja pobiera publiczne ustawienia.
3. Jeśli tryb prac jest aktywny, zamiast normalnego widoku pojawia się pełnoekranowa plansza.
4. Użytkownik dostaje spokojny komunikat, że trwają prace.
5. Użytkownik może przejść tylko do dozwolonych stron wyjątków, jeśli będą dostępne.

## Ryzyka użyteczności

- Zbyt techniczny tekst sprawi wrażenie awarii.
- Brak ETA może frustrować, ale fałszywe ETA jest gorsze niż brak ETA.
- Zbyt ciężka animacja kosmosu może pogorszyć mobile performance.

## Polska konkluzja

Widok powinien być spokojny, piękny i konkretny: „pracujemy nad stroną”, bez marketingowego przeładowania i bez obietnic, których nie możemy dotrzymać.
