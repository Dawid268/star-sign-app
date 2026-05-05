# Implementation plan

Status: zaimplementowane.

## Faza 1: Kontrakt i API

1. Rozszerzyć `libs/shared/types/src/lib/app-settings.types.ts`:
   - `PublicMaintenanceModeSettings`
   - pole `maintenanceMode` w `PublicAppSettingsResponse`.
2. Rozszerzyć `apps/api/src/api/app-setting/content-types/app-setting/schema.json`.
3. Rozszerzyć `apps/api/src/utils/app-settings.ts`:
   - typ `AppSettings`,
   - `AppSettingRecord`,
   - `defaultAppSettings`,
   - normalizację pól maintenance.
4. Rozszerzyć `apps/api/src/api/app-setting/controllers/app-setting.ts`.
5. Dodać/rozszerzyć testy:
   - `apps/api/src/utils/app-settings.test.ts`
   - `apps/api/src/api/app-setting/controllers/app-setting.test.ts`

Wynik: wykonane.

## Faza 2: Frontend service

1. Rozszerzyć `frontend/src/app/core/services/app-settings.service.ts`.
2. Dodać walidację/fallback maintenance.
3. Rozszerzyć `frontend/src/app/core/services/app-settings.service.spec.ts`.

Wynik: wykonane.

## Faza 3: UI

1. Dodać standalone component:
   - `frontend/src/app/core/components/maintenance-mode/maintenance-mode.ts`
   - jeśli projekt preferuje osobne pliki, użyć `.html` i `.scss`.
2. Motyw:
   - pełny viewport,
   - ciemne niebo,
   - gwiazdy CSS,
   - subtelna orbita,
   - `prefers-reduced-motion`.
3. Dodać test komponentu:
   - renderuje title/message,
   - renderuje ETA tylko gdy istnieje,
   - renderuje link tylko gdy istnieje.

Wynik: wykonane. Dodano `frontend/src/app/core/components/maintenance-mode/`.

## Faza 4: Root shell

1. W `frontend/src/app/app.ts` wstrzyknąć `AppSettingsService`.
2. Dodać computed/signal:
   - `maintenanceVisible`,
   - `maintenanceSettings`.
3. W `frontend/src/app/app.html` opakować normalny shell warunkiem.
4. Dodać testy `frontend/src/app/app.spec.ts`:
   - tryb off pokazuje router shell,
   - tryb on pokazuje maintenance i ukrywa navbar/footer/koszyk,
   - wyjątek path pokazuje normalny shell.

Wynik: wykonane.

## Faza 5: E2E

1. Dodać scenariusz Playwright z mockiem `/api/app-settings/public`.
2. Sprawdzić desktop i mobile:
   - widok maintenance,
   - brak normalnego contentu,
   - kontrast i brak overflow.

Wynik: wykonane. Dodano `frontend-e2e/src/maintenance-mode.spec.ts` i defaultowy mock app settings.

## Polska konkluzja

Implementację najlepiej zrobić etapami: najpierw kontrakt i API, potem service, potem komponent i dopiero root shell. To minimalizuje ryzyko regresji w obecnym dirty working tree.

Aktualizacja po implementacji: wszystkie fazy zostały wykonane bez zmiany osobnego endpointu i bez blokowania Strapi admina/API health.
