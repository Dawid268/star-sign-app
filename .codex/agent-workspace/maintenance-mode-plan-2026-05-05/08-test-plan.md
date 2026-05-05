# Test plan

## API

- `apps/api/src/utils/app-settings.test.ts`
  - domyślnie `maintenanceMode.enabled=false`;
  - normalizuje title/message;
  - puste wartości zastępuje fallbackiem;
  - `maintenance_eta` zwraca ISO string albo `null`;
  - `allowedPaths` zawsze jest tablicą bezpiecznych ścieżek.
- `apps/api/src/api/app-setting/controllers/app-setting.test.ts`
  - public endpoint zwraca `maintenanceMode`;
  - public endpoint nie zwraca sekretów ani tokenów bypass.

## Frontend unit

- `AppSettingsService`
  - normalizuje `maintenanceMode`;
  - fallback przy błędzie API: `enabled=false`;
  - ignoruje nieprawidłowy `contactUrl`.
- `MaintenanceModeComponent`
  - renderuje title/message;
  - obsługuje brak ETA;
  - spełnia podstawowe role/semantykę.
- `App`
  - `enabled=false`: normalny shell;
  - `enabled=true`: maintenance zamiast shellu;
  - allowed path: normalny shell.

## E2E

- Mock `/api/app-settings/public` z `maintenanceMode.enabled=true`.
- Wejście na `/`, `/premium`, `/horoskopy` pokazuje maintenance.
- Wejście na `/polityka-prywatnosci` pokazuje normalną stronę.
- Mobile viewport nie ma poziomego overflow.

## Komendy

- `rtk npm exec -- nx run api:test --outputStyle=static`
- `rtk npm exec -- nx run frontend:test --configuration=coverage`
- `rtk npm exec -- nx run frontend:lint --outputStyle=static`
- `rtk npm exec -- nx run frontend:typecheck --outputStyle=static`
- `rtk npm exec -- nx run @org/types:typecheck --outputStyle=static`
- `rtk npm exec -- nx run frontend-e2e:e2e --outputStyle=static`
- `rtk git diff --check`

## Polska konkluzja

Testy muszą potwierdzić nie tylko widok maintenance, ale też bezpieczny fallback i brak przypadkowego blokowania ścieżek wyjątków.
