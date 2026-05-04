# 🚀 Getting started with Strapi

Strapi comes with a full featured [Command Line Interface](https://docs.strapi.io/dev-docs/cli) (CLI) which lets you scaffold and manage your project in seconds.

### `develop`

Start your Strapi application with autoReload enabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-develop)

```
npm run develop
# or
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-start)

```
npm run start
# or
yarn start
```

### `build`

Build your admin panel. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-build)

```
npm run build
# or
yarn build
```

### `seed:dev`

Zasila bazę danych zestawem danych developerskich (idempotentnie):

- znaki zodiaku
- horoskopy
- karty tarota + karta dnia
- artykuły i kategorie
- produkty
- profile numerologiczne
- konto demo z profilem i przykładową subskrypcją

```
npm run seed:dev
```

W monorepo przez Nx:

```
npm exec nx run api:seed-dev
```

### Cloudflare R2 jako źródło assetów (Media Library)

1. W `apps/api/.env` ustaw:
   `R2_UPLOAD_ENABLED=true`
   `R2_ACCESS_KEY_ID=...`
   `R2_SECRET_ACCESS_KEY=...`

2. Bucket `star-sign` musi być dostępny do odczytu dla assetów, albo podaj publiczny/custom CDN URL przez:
   `R2_PUBLIC_BASE_URL=https://<publiczny-host-bucketu>`

3. Zrestartuj API:

```
npm exec nx run api:serve
```

Konfiguracja uploadu używa providera `@strapi/provider-upload-aws-s3` z endpointem Cloudflare R2 (`R2_S3_ENDPOINT`).

## ⚙️ Deployment

Strapi gives you many possible deployment options for your project including [Strapi Cloud](https://cloud.strapi.io). Browse the [deployment section of the documentation](https://docs.strapi.io/dev-docs/deployment) to find the best solution for your use case.

```
yarn strapi deploy
```

## 📚 Learn more

- [Resource center](https://strapi.io/resource-center) - Strapi resource center.
- [Strapi documentation](https://docs.strapi.io) - Official Strapi documentation.
- [Strapi tutorials](https://strapi.io/tutorials) - List of tutorials made by the core team and the community.
- [Strapi blog](https://strapi.io/blog) - Official Strapi blog containing articles made by the Strapi team and the community.
- [Changelog](https://strapi.io/changelog) - Find out about the Strapi product updates, new features and general improvements.

Feel free to check out the [Strapi GitHub repository](https://github.com/strapi/strapi). Your feedback and contributions are welcome!

## ✨ Community

- [Discord](https://discord.strapi.io) - Come chat with the Strapi community including the core team.
- [Forum](https://forum.strapi.io/) - Place to discuss, ask questions and find answers, show your Strapi project and get feedback or just talk with other Community members.
- [Awesome Strapi](https://github.com/strapi/awesome-strapi) - A curated list of awesome things related to Strapi.

---

<sub>🤫 Psst! [Strapi is hiring](https://strapi.io/careers).</sub>
