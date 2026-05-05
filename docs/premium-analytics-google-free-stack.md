# Analityka Premium: darmowy stos Google

## Źródło prawdy

Pierwszorzędna analityka produktowa jest zapisywana w Strapi jako
`Analytics Event`. Działa dla gości i zalogowanych użytkowników, niezależnie od
zgody na GA4.

## Obecna polityka dostępu Premium

Na obecnym etapie wzrostu Premium jest celowo otwarte:

- goście i zalogowani użytkownicy mają pełny dostęp do treści Premium,
- treści Premium nie wolno jeszcze blokować,
- celem jest zachęcenie do użycia i pomiar popytu przed egzekwowaniem płatności,
- analityka nadal powinna rozdzielać zachowanie gości i zalogowanych użytkowników,
- płatne egzekwowanie dostępu włączamy później przez `App Settings` /
  `PREMIUM_MODE=paid`.

W Strapi `App Settings` jest operacyjnym panelem administracyjnym dla Premium i
kontroli uruchomienia Stripe. To powinno pozostać miejsce do zarządzania:

- `premium_mode` (`open` teraz, `paid` dla pełnego płatnego Premium),
- publicznymi cenami,
- miesięcznym i rocznym Stripe Price ID,
- `stripe_checkout_enabled`,
- liczbą dni triala i polityką kodów promocyjnych.

Publiczny endpoint `/api/app-settings/public` wystawia tylko pola bezpieczne dla
frontendu: tryb, ceny, walutę, trial, politykę kodów promocyjnych,
`stripe_checkout_enabled` oraz pochodne `paidPremiumEnabled`.

Pełny płatny Premium można uruchomić dopiero, gdy jednocześnie:

- `premium_mode=paid`,
- `stripe_checkout_enabled=true`,
- Stripe secret i Price IDs są poprawnie ustawione w env/Strapi.

Sekrety Stripe i sekrety webhooków muszą pozostać w runtime env, nie w Strapi.

Kluczowe eventy treści:

- `daily_horoscope_view`
- `premium_content_impression`
- `premium_content_view`
- `premium_cta_click`
- `premium_pricing_view`
- `begin_checkout`
- `checkout_redirect`
- `purchase`
- `premium_subscription_conversion`

`premium_content_view` dostaje `is_unique_daily=true` tylko raz dla
`visitor_id + content + day`, żeby dashboardy mogły rozdzielić unikalne osoby od
łącznej liczby wyświetleń.

Kluczowe wymiary dashboardowe zapisywane w Strapi:

- `premium_mode`
- `premium_access_policy`
- `access_state`
- `auth_state`
- `visitor_segment`
- `subscription_status`
- `subscription_plan`
- `funnel_step`
- `cta_location`
- `ui_surface`
- `content_type`, `content_slug`, `sign_slug`, `horoscope_period`
- `plan`, `currency`, `value`

## Runtime Env

Soft launch:

```dotenv
STRIPE_REQUIRED=false
PREMIUM_MODE=open
GA4_MEASUREMENT_ID=G-...
GTM_CONTAINER_ID=GTM-...
```

Płatny launch Premium:

```dotenv
STRIPE_REQUIRED=true
PREMIUM_MODE=paid
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Stripe Price IDs i publiczne ceny są zarządzane w Strapi `App Settings`.
Dla płatnego Premium używamy Stripe Billing, subskrypcyjnych Checkout Sessions i
Customer Portal. Nie budujemy własnej logiki odnawiania subskrypcji.

## Preflight Production Compose

Przed live-checkami potwierdź, że publiczny runtime env analityki trafia do
kontenera frontendu:

```bash
GA4_MEASUREMENT_ID=G-TEST123 GTM_CONTAINER_ID=GTM-TEST123 docker compose config
```

W wyrenderowanym `frontend.environment` sprawdź:

- `GA4_MEASUREMENT_ID`
- `GTM_CONTAINER_ID`

API używa `PREMIUM_MODE` jako fallbacku dla `App Settings`. Utrzymuj `open` dla
soft launchu i przełącz na `paid` dopiero przy płatnym launchu Premium.
Frontend czyta publiczne `App Settings`, więc ceny i `premium_mode` w analityce
powinny podążać za Strapi, a checkout pozostaje wyłączony w trybie `open`.

## Konfiguracja Google

1. Utwórz właściwość GA4 i Web data stream.
2. Wstaw prawdziwe `GA4_MEASUREMENT_ID` do runtime env.
3. Utwórz kontener GTM Web i wstaw `GTM_CONTAINER_ID` do runtime env.
4. W GTM dodaj Google tag dla GA4 measurement ID.
5. Dodaj tagi GA4 Event wyzwalane nazwami eventów `dataLayer` z listy powyżej.
6. Zarejestruj podstawowe custom dimensions GA4:
   `content_type`, `content_slug`, `sign_slug`, `horoscope_period`,
   `premium_mode`, `premium_access_policy`, `access_state`, `auth_state`,
   `visitor_segment`, `subscription_status`, `subscription_plan`,
   `funnel_step`, `cta_location`, `ui_surface`, `plan`.
7. Oznacz key events w GA4:
   `premium_content_view`, `premium_cta_click`, `begin_checkout`, `purchase`,
   `premium_subscription_conversion`.
8. Najpierw zbuduj Looker Studio na GA4. BigQuery Export dodaj tylko wtedy, gdy
   analiza surowych eventów będzie potrzebna poza Strapi Content Managerem.

## Live Check

- GTM Preview pokazuje `daily_horoscope_view`, `premium_content_view`,
  `premium_cta_click`.
- GA4 DebugView pokazuje te same nazwy eventów i parametry.
- Strapi Content Manager pokazuje odpowiadające wiersze `Analytics Event` dla
  sesji gościa i zalogowanego użytkownika.
