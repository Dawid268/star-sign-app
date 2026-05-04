# Premium Analytics: Google Free Stack

## Source of Truth

First-party product analytics are stored in Strapi as `Analytics Event`.
This works for guests and logged-in users, independently from GA4 consent.

Key content events:

- `daily_horoscope_view`
- `premium_content_impression`
- `premium_content_view`
- `premium_cta_click`
- `premium_pricing_view`
- `begin_checkout`
- `checkout_redirect`
- `purchase`
- `premium_subscription_conversion`

`premium_content_view` is marked with `is_unique_daily=true` only once per
`visitor_id + content + day`, so dashboards can separate unique people from all
views.

## Runtime Env

Soft launch:

```dotenv
STRIPE_REQUIRED=false
PREMIUM_MODE=open
GA4_MEASUREMENT_ID=G-...
GTM_CONTAINER_ID=GTM-...
```

Paid Premium launch:

```dotenv
STRIPE_REQUIRED=true
PREMIUM_MODE=paid
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Stripe price IDs and public prices are managed in Strapi `App Settings`.

## Google Setup

1. Create GA4 property and Web data stream.
2. Put the real `GA4_MEASUREMENT_ID` in runtime env.
3. Create GTM Web container and put `GTM_CONTAINER_ID` in runtime env.
4. In GTM, add a Google tag for the GA4 measurement ID.
5. Add GA4 Event tags triggered from `dataLayer` event names above.
6. Register only core GA4 custom dimensions:
   `content_type`, `content_slug`, `sign_slug`, `horoscope_period`,
   `premium_mode`, `access_state`, `plan`.
7. Mark key events in GA4:
   `premium_content_view`, `premium_cta_click`, `begin_checkout`, `purchase`,
   `premium_subscription_conversion`.
8. Build Looker Studio on GA4 first. Add BigQuery Export only if raw event
   analysis is needed beyond the Strapi Content Manager.

## Live Check

- GTM Preview shows `daily_horoscope_view`, `premium_content_view`,
  `premium_cta_click`.
- GA4 DebugView shows the same event names and parameters.
- Strapi Content Manager shows matching `Analytics Event` rows for guest and
  logged-in sessions.
