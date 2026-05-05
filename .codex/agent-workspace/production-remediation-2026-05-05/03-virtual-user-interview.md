# Virtual User Interview

## Perspektywa użytkownika

Użytkownik nie zobaczy bezpośrednio większości tych zmian, ale odczuje ich skutki: stabilniejszy deployment, mniejsze ryzyko błędów bezpieczeństwa i pewniejsze działanie strony w trybie prac.

## Ryzyka użytkownika

- Jeśli publiczne App Settings wyciekną sekretami, użytkownik może nigdy tego nie zauważyć, ale produkt ma poważny problem bezpieczeństwa.
- Jeśli nagłówki bezpieczeństwa są słabe, podatność XSS lub embedding strony ma większy wpływ.
- Jeśli monitoring ma placeholder, awarie po starcie mogą zostać niezauważone.

## Polska konkluzja

Z perspektywy użytkownika to prace niewidoczne, ale ważne dla zaufania. Najważniejsze jest, żeby po tych zmianach staging smoke potwierdził realny stan strony.
