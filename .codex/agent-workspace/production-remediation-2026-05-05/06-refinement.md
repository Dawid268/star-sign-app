# Refinement

## Co implementujemy teraz

- Override nested `axios` w `apps/api`.
- Czytelny helper SQLite dla audytów API.
- Nagłówki Caddy: `X-Frame-Options`, minimalny CSP i `Permissions-Policy`.
- Wymagane sekrety Bugsink w Docker Compose zamiast placeholder defaults.
- Smoke check publicznych App Settings bez sekretów.

## Akceptacja

- `apps/api` audit nie powinien już mieć high `axios`.
- Audyty API przy braku SQLite DB powinny zwracać kontrolowany komunikat.
- `docker compose config --quiet` ma przechodzić przy poprawnym `.env`.
- `ops/smoke.sh` ma wykrywać publiczny wyciek sekretów App Settings.
- Testy API i podstawowe walidacje mają przejść.

## Polska konkluzja

Zakres jest mały, ale produkcyjnie istotny. Po nim nadal zostają staging/live dowody i formalna decyzja dla pozostałych podatności.
