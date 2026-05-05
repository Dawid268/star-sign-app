# QA report

Status: zaliczone po implementacji.

## Ryzyka QA do pilnowania przy implementacji

- Flicker: normalna strona nie powinna mignąć na moment, jeśli maintenance jest aktywny.
- SSR/hydration: checking state musi być deterministyczny.
- Mobile: kosmiczne tło nie może powodować overflow ani spadków wydajności.
- Analytics: event maintenance nie może spamować przy każdym change detection.
- Cookie banner/toast/cart nie powinny zasłaniać widoku maintenance.

## Wykonane testy

- `rtk npm exec -- nx run api:test --outputStyle=static`: PASS, 107 testów.
- `rtk npm exec -- nx run api:typecheck --outputStyle=static`: PASS.
- `rtk npm exec -- nx run api:build --outputStyle=static`: PASS.
- `rtk npm exec -- nx run @org/types:typecheck --outputStyle=static`: PASS.
- `rtk npm exec -- nx run frontend:typecheck --outputStyle=static`: PASS.
- `rtk npm exec -- nx run frontend:test --configuration=coverage`: PASS, 338 testów, statements 85.53%, lines 86.59%.
- `rtk npm exec -- nx run frontend:lint --outputStyle=static`: PASS, 108 istniejących warningów, 0 errors.
- `rtk npm exec -- nx run frontend:build:production --outputStyle=static`: PASS.
- `rtk npm exec -- nx run frontend-e2e:typecheck --outputStyle=static`: PASS.
- `rtk npm exec -- nx run frontend-e2e:lint --outputStyle=static`: PASS, 17 istniejących warningów, 0 errors.
- `rtk npm exec -- nx run frontend-e2e:e2e --outputStyle=static`: PASS, 76/76.
- `rtk git diff --check`: PASS.

## Co zostało sprawdzone

- Publiczny endpoint zwraca `maintenanceMode` i nie ujawnia Stripe secretów ani bypass tokenów.
- API normalizuje copy, ETA, contact URL i allowed paths.
- Frontend fallback przy błędzie API zostawia `maintenanceMode.enabled=false`.
- Root shell pokazuje maintenance zamiast normalnego route shellu.
- Wyjątek `/polityka-prywatnosci` pozostaje dostępny.
- E2E potwierdza brak overflow na mobile.

## Pozostałe ryzyka

- Repo nadal ma istniejące warningi lint w starszych testach i komponentach. Nie są nowe dla tej funkcji.
- W trybie aktywnym decyzja frontendu nadal zależy od pobrania publicznych ustawień z API. Dla MVP to świadomy trade-off, bo unikamy SSR middleware.

## Polska konkluzja

Najważniejsze testy to root shell i e2e z mockiem publicznych ustawień. To one potwierdzą, że tryb prac realnie blokuje stronę dla użytkownika.

Aktualizacja po implementacji: tryb prac został zweryfikowany unitami, buildem i E2E. Funkcja jest gotowa do użycia po ustawieniu flagi w Strapi App Settings.
