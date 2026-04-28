# Star Sign Launch Handoff

Ostatnia aktualizacja: 2026-04-28

## Aktualny zakres

- API: Strapi 5, publiczne RBAC dla contentu, sklep domyślnie ukryty przez `SHOP_ENABLED=false`.
- Frontend: Angular SSR, sklep ukryty przez `features.shopEnabled=false` i `FRONTEND_SHOP_ENABLED=false`.
- Dane: seed dev/prod zapewnia znaki zodiaku, tarot, numerologię, artykuły, horoskopy, daily tarot i workflow AICO.
- AICO: `Run now`, `Stop`, `Delete workflow`, monitoring runów, kroki, prompt, raw response, parsed JSON i błędy.
- Mail: Brevo jako newsletter i SMTP przez Strapi email provider.
- VPS: przygotowany Dockerfile multi-target, `docker-compose.yml`, Caddy, Postgres, smoke script i backup Postgresa.

## Konta testowe po `npm exec nx run api:seed-dev`

- Demo: `demo@starsign.local` / `Test1234!`
- Premium: `premium@starsign.local` / `Test1234!`

## Env produkcyjny

Start z `.env.example`. Na VPS skopiować do `.env` i uzupełnić realne wartości:

- domeny: `FRONTEND_URL`, `API_PUBLIC_URL`, `FRONTEND_DOMAIN`, `API_DOMAIN`, `CORS_ORIGIN`
- sekrety Strapi: `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`
- baza: `POSTGRES_*`, `DATABASE_*`
- media: `R2_*`
- newsletter/mail: `BREVO_API_KEY`, `BREVO_LIST_ID`, `BREVO_SMTP_*`, `BREVO_WEBHOOK_SECRET`
- AI: `AICO_OPENROUTER_TOKEN`, `AICO_ENABLE_WORKFLOWS`
- observability: `SENTRY_DSN`

Sekrety z lokalnych `.env` należy rotować przed produkcją.

## Komendy weryfikacji

```bash
npm exec nx sync:check
npm exec nx run api:typecheck
npm exec nx run api:build
npm exec nx run frontend:typecheck
npm exec nx run frontend:build
```

Smoke lokalny po uruchomieniu API i frontendu:

```bash
API_BASE_URL=http://localhost:1337/api FRONTEND_BASE_URL=http://localhost:4200 ./ops/smoke.sh
```

Smoke VPS po deployu:

```bash
API_BASE_URL=https://api.example.com/api FRONTEND_BASE_URL=https://example.com ./ops/smoke.sh
```

## Deployment VPS, kiedy przyjdzie pora

```bash
cp .env.example .env
# uzupełnić .env realnymi sekretami
docker compose build
docker compose up -d postgres
docker compose up -d api frontend caddy
docker compose logs -f api frontend caddy
```

Seed produkcyjny tylko świadomie:

```bash
ALLOW_PRODUCTION_SEED=true docker compose exec api npm run seed:prod
```

Backup Postgresa:

```bash
POSTGRES_DB=star_sign POSTGRES_USER=star_sign ./ops/backup-postgres.sh
```

## Otwarte decyzje przed publikacją

- Uzupełnić realne dane administratora w polityce prywatności i regulaminie.
- Dodać docelową domenę, DNS, SPF, DKIM i DMARC dla Brevo.
- Zdecydować, czy przed launch przenosimy auth z JWT w `localStorage` do cookie `Secure HttpOnly`.
- Ustawić docelowe limity AICO i dodać realny token OpenRouter.
- Po pierwszym buildzie admina sprawdzić ręcznie plugin SEO w Strapi Admin i dodać komponent `seo` do content type, jeśli ma być zarządzany edytorsko.
