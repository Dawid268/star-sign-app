export const environment = {
  production: false,
  apiUrl: '/api',
  siteUrl: 'http://localhost:4200',
  sentry: {
    dsn: '',
    environment: 'development',
    release: '',
    tracesSampleRate: 0,
    tracePropagationTargets: [/^\/api/],
  },
  features: {
    shopEnabled: false,
    adsEnabled: false,
  },
  analytics: {
    ga4MeasurementId: '',
    gtmContainerId: '',
  },
  seo: {
    defaultImageUrl: '/assets/og-default.png',
  },
  turnstile: {
    enabled: false,
    siteKey: '',
  },
};
