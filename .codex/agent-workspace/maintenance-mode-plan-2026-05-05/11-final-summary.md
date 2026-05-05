# Final summary

Data: 2026-05-05

Status: zaimplementowane.

## Rekomendacja

Zbudować tryb `maintenance / work in progress` jako rozszerzenie istniejącego `App Settings`.

## Plan MVP

- API: dodano pola `maintenance_mode_enabled`, `maintenance_title`, `maintenance_message`, `maintenance_eta`, `maintenance_contact_url`, `maintenance_allowed_paths`.
- Public endpoint: dodano obiekt `maintenanceMode` do `GET /api/app-settings/public`.
- Shared types: dodano typ `PublicMaintenanceModeSettings`.
- Frontend service: dodano normalizację i fallback `enabled=false`.
- UI: dodano standalone `MaintenanceModeComponent` z motywem gwiazd i kosmosu.
- Root shell: aktywny tryb renderuje maintenance zamiast navbaru, route'ów, footera, koszyka, cookie banner i toastów.
- Testy: dodano/rozszerzono API, service, root shell, komponent i e2e z mockiem endpointu.

## Domyślne zachowanie

- Jeśli API nie odpowiada: strona działa normalnie.
- Jeśli tryb aktywny: publiczne route'y pokazują widok prac.
- Jeśli path jest wyjątkiem: normalny widok.

## Polska konkluzja

To jest mały, dobrze odseparowany feature toggle. Największą wartość da operatorowi, bo będzie mógł wyłączyć publiczną stronę bez deploya, a użytkownik zobaczy spójny, markowy ekran zamiast niedokończonego produktu.

## Walidacja

- API test/typecheck/build: PASS.
- Shared types typecheck: PASS.
- Frontend test/typecheck/lint/build: PASS.
- Frontend E2E typecheck/lint/e2e: PASS, 76/76.
- `git diff --check`: PASS.
