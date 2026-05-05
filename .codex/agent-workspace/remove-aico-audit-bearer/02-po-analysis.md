# Product Owner analysis

## Cel

Usunac niejasny i blokujacy deploy wymog `AICO_AUDIT_BEARER` oraz wpisac realny identyfikator GA4.

## Decyzja produktowa

- Deploy ma byc przewidywalny: po przejsciu release gate, buildzie obrazow, webhooku Portainera, smoke, headers i e2e nie powinien blokowac sie na AICO audit tokenie.
- AICO audit jest nadal wartosciowy, ale jako reczny check operacyjny w panelu Strapi, szczegolnie przed wlaczeniem autonomicznego publikowania.

## Kryteria akceptacji

- GitHub Actions nie wymaga secretu `AICO_AUDIT_BEARER`.
- Produkcyjny deploy nie uruchamia AICO preflight jako hard gate.
- Dokumentacja nie instruuje ustawiania `AICO_AUDIT_BEARER`.
- Lokalny env ma `GA4_MEASUREMENT_ID=G-5T6LZEVYVZ`.

## Podsumowanie po polsku

Zmiana upraszcza pierwszy deploy i usuwa mylacy token. Ryzyko AICO zostaje przeniesione do recznej kontroli operacyjnej, a nie do automatycznej blokady release.
