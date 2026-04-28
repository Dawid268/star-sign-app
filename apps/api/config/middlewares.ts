import type { Core } from '@strapi/strapi';

const parseCsv = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => {
  const origins = parseCsv(env('CORS_ORIGIN', 'http://localhost:4200,http://127.0.0.1:4200'));
  const uploadAssetCspOrigins = parseCsv(env('UPLOAD_ASSET_CSP_ORIGINS', ''));

  return [
    'strapi::logger',
    'strapi::errors',
    {
      name: 'strapi::security',
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            'connect-src': ["'self'", 'https:', ...uploadAssetCspOrigins],
            'img-src': ["'self'", 'data:', 'blob:', 'https://market-assets.strapi.io', ...uploadAssetCspOrigins],
            'media-src': ["'self'", 'data:', 'blob:', ...uploadAssetCspOrigins],
            upgradeInsecureRequests: null,
          },
        },
        hsts: env.bool('SECURITY_HSTS_ENABLED', env('NODE_ENV') === 'production')
          ? {
              maxAge: env.int('SECURITY_HSTS_MAX_AGE', 31536000),
              includeSubDomains: true,
              preload: false,
            }
          : false,
      },
    },
    {
      name: 'strapi::cors',
      config: {
        origin: origins,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
        headers: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'Stripe-Signature'],
        keepHeaderOnError: true,
      },
    },
    {
      name: 'global::rate-limit',
      config: {
        enabled: env.bool('RATE_LIMIT_ENABLED', true),
        windowMs: env.int('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
        max: env.int('RATE_LIMIT_MAX', env('NODE_ENV') === 'production' ? 80 : 300),
      },
    },
    'strapi::poweredBy',
    'strapi::query',
    {
      name: 'strapi::body',
      config: {
        includeUnparsed: true,
        jsonLimit: env('BODY_JSON_LIMIT', '1mb'),
        formLimit: env('BODY_FORM_LIMIT', '1mb'),
        textLimit: env('BODY_TEXT_LIMIT', '1mb'),
        formidable: {
          maxFileSize: env.int('UPLOAD_MAX_FILE_SIZE', 10 * 1024 * 1024),
        },
      },
    },
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ];
};

export default config;
