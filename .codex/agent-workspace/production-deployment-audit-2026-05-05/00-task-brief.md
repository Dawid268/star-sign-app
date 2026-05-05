# Audyt przed deploymentem na produkcję

Data: 2026-05-05

## Cel

Sprawdzić aktualny lokalny working tree projektu Star Sign i podsumować, co jeszcze musi zostać domknięte przed deploymentem na produkcję.

## Zakres

- Aktualny dirty working tree, nie tylko ostatni commit.
- API Strapi, frontend Angular, AICO plugin, Premium, maintenance mode, Docker/ops, testy Nx i audyty bezpieczeństwa.
- Audyt raportowy. Nie uruchamiano live Stripe, live GA4 ani aktywnych testów produkcyjnych.

## Kluczowa konkluzja

Publiczny deployment produkcyjny: **NO-GO**.

Warunkowy deployment na staging albo produkcję za włączonym `maintenance_mode_enabled=true`: **GO warunkowe**, jeśli środowisko ma komplet realnych sekretów, domenę, bazę, monitoring i przejdzie CI z czystego checkoutu.

## Najważniejsze blokery

- `apps/api` ma `npm audit --omit=dev` z 27 podatnościami produkcyjnymi, w tym 1 high.
- Domenowe audyty API nie przeszły lokalnie, bo brakuje katalogu bazy danych.
- AICO preflight CI nie został wykonany, bo wymaga `AICO_AUDIT_BEARER`.
- Brakuje dowodów live/staging dla Stripe, GA4, monitoring, backup restore i produkcyjnych zmiennych środowiskowych.
- Working tree jest bardzo brudny i wymaga świadomego przeglądu, commitów oraz CI z czystego checkoutu.
