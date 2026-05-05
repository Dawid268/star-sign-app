# Virtual User Interview

## Symulowana perspektywa użytkownika

Jako użytkownik chcę wejść na stronę i od razu zrozumieć, czy mogę korzystać z horoskopów, tarota, numerologii i Premium. Jeśli strona jest w trybie prac, oczekuję jasnego komunikatu, kiedy wróci i czy moje dane albo płatności są bezpieczne.

## Oczekiwania użytkownika

- Strona nie powinna wyglądać jak zepsuta podczas deploymentu.
- Jeśli Premium jest otwarte, nie powinienem trafić na mylący paywall.
- Jeśli płatności są aktywne, checkout musi działać przewidywalnie i mieć jasne ekrany success/cancel.
- Formularze, newsletter, konto i kontakt muszą chronić przed spamem i dawać czytelne błędy.
- Na mobile nawigacja i główne ścieżki muszą działać bez przycinania lub nachodzenia tekstu.

## Ryzyka frustracji

- Maintenance mode bez realnej daty powrotu może wyglądać jak awaria.
- Publiczny launch z otwartym Premium, ale z widocznymi cenami, może mylić użytkownika, jeśli CTA nie są jednoznaczne.
- Problemy Stripe albo GA4 po starcie są trudne do zauważenia bez monitoringu i eventów kontrolnych.
- Social automation AICO może przyciągnąć ruch szybciej, niż aplikacja będzie gotowa operacyjnie.

## Polska konkluzja

Dla użytkownika najbezpieczniejsza ścieżka to najpierw deployment za maintenance mode i dopiero po smoke testach zdjęcie blokady. Publiczny start bez dowodów staging/live grozi utratą zaufania przy pierwszym kontakcie.
