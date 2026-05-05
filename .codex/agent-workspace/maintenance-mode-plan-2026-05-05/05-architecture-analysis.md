# Architecture analysis

## Rekomendowana architektura

Rozszerzyć istniejący mechanizm `App Settings`, zamiast tworzyć osobny endpoint.

## API

### Strapi single type

Rozszerzyć `apps/api/src/api/app-setting/content-types/app-setting/schema.json` o pola:

- `maintenance_mode_enabled`: boolean, default `false`, required.
- `maintenance_title`: string, max 120.
- `maintenance_message`: text, max 500.
- `maintenance_eta`: datetime, optional.
- `maintenance_contact_url`: string, optional.
- `maintenance_allowed_paths`: json albo text array, optional, default lista bezpiecznych wyjątków.

### Normalizacja

Rozszerzyć `AppSettings` i `defaultAppSettings()`:

```ts
maintenanceMode: {
  enabled: boolean;
  title: string;
  message: string;
  eta: string | null;
  contactUrl: string | null;
  allowedPaths: string[];
}
```

Domyślne wartości:

- `enabled=false`
- `title='Pracujemy nad Star Sign'`
- `message='Dopracowujemy stronę i wrócimy za chwilę.'`
- `eta=null`
- `contactUrl=null`
- `allowedPaths=['/regulamin','/polityka-prywatnosci','/cookies','/disclaimer','/newsletter/potwierdz','/newsletter/wypisz']`

### Publiczny kontrakt

`GET /api/app-settings/public` zwraca:

```json
{
  "maintenanceMode": {
    "enabled": true,
    "title": "Pracujemy nad Star Sign",
    "message": "Dopracowujemy stronę i wrócimy za chwilę.",
    "eta": null,
    "contactUrl": null,
    "allowedPaths": ["/regulamin", "/polityka-prywatnosci"]
  }
}
```

Nie zwraca żadnych sekretów, tokenów bypass ani wewnętrznych powodów operacyjnych.

## Frontend

### Typy

Rozszerzyć `libs/shared/types/src/lib/app-settings.types.ts` o `PublicMaintenanceModeSettings`.

### Service

Rozszerzyć `AppSettingsService`:

- normalizacja `maintenanceMode`,
- fallback `enabled=false`,
- walidacja `contactUrl` tylko dla `https://`, `mailto:` albo ścieżki względnej.

### Root shell

W `App` pobrać `AppSettingsService`.

Proponowany model:

- `maintenanceState = signal<'checking' | 'enabled' | 'disabled'>('checking')`
- `maintenanceSettings = signal(DEFAULT_PUBLIC_APP_SETTINGS.maintenanceMode)`
- po pobraniu ustawień:
  - jeśli `enabled=true` i bieżąca ścieżka nie jest wyjątkiem, renderować `MaintenanceModePage`;
  - w przeciwnym razie renderować normalny shell.

### Komponent

Nowy standalone component:

- `frontend/src/app/core/components/maintenance-mode/maintenance-mode.ts`
- template i style lokalne.

Renderowany w `app.html`:

```html
@if (maintenanceVisible()) {
  <app-maintenance-mode [settings]="maintenanceSettings()" />
} @else {
  <app-loading-bar />
  <app-navbar (openCart)="openCart()" />
  <main class="min-h-screen">
    <router-outlet />
  </main>
  <app-footer />
  ...
}
```

## Wyjątki

MVP powinien przepuszczać:

- `/regulamin`
- `/polityka-prywatnosci`
- `/cookies`
- `/disclaimer`
- `/newsletter/potwierdz`
- `/newsletter/wypisz`

Nie przepuszczać checkout, premium, panelu, bloga, horoskopów ani strony głównej.

## Alternatywy

### Osobny endpoint `/api/site-status`

Plus: czysty kontrakt.

Minus: dubluje `App Settings`, dodatkowy route i testy.

### Guard na wszystkich route'ach

Plus: semantycznie blokuje routing.

Minus: cięższe utrzymanie, łatwiej pominąć route, więcej zmian w konfiguracji.

### Middleware SSR

Plus: blokada jeszcze przed renderem Angulara.

Minus: bardziej ryzykowne i zależne od SSR runtime, niepotrzebne dla MVP.

## Decyzja

MVP: root shell sterowany publicznym `App Settings`.

## Polska konkluzja

Najbezpieczniejszy wariant to globalny frontendowy shell zależny od istniejącego publicznego endpointu ustawień. API pozostaje źródłem prawdy, ale nie blokuje technicznie health/admin/Strapi.
