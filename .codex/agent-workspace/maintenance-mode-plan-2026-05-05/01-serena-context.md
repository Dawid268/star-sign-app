# Serena context

Data: 2026-05-05

## Użycie Sereny

Serena była dostępna.

Odczytano pamięć:

- `premium/app_settings_paid_checkout_switch_2026_05_04`

Użyto semantic overview dla:

- `apps/api/src/utils/app-settings.ts`
- `frontend/src/app/core/services/app-settings.service.ts`
- `frontend/src/app/app.ts`

## Ustalenia

- Projekt ma już wzorzec publicznych ustawień aplikacji przez `GET /api/app-settings/public`.
- API normalizuje ustawienia w `apps/api/src/utils/app-settings.ts`.
- Frontend ma `AppSettingsService`, który pobiera publiczne ustawienia z timeoutem, `shareReplay` i fallbackiem.
- Root komponent `frontend/src/app/app.ts` renderuje globalny shell: loading bar, navbar, `router-outlet`, footer, koszyk, cookie banner i toast.
- Najlepsze miejsce na globalny tryb prac to root shell, nie pojedyncze route'y.

## Polska konkluzja

Tryb prac należy zbudować jako rozszerzenie istniejącego `App Settings`, żeby backend był jedynym źródłem decyzji, a frontend tylko renderował bezpieczny publiczny stan.

## Zapis reusable knowledge

Po przygotowaniu planu zapisano pamięć:

- `project/maintenance_mode_plan_2026_05_05`

Po implementacji zapisano pamięć:

- `project/maintenance_mode_implementation_2026_05_05`
