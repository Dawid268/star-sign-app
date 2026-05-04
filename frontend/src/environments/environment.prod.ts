export const environment = {
  production: true,
  apiUrl: '/api',
  siteUrl: 'https://star-sign.pl',
  sentry: {
    dsn: '',
    environment: 'production',
    release: '',
    tracesSampleRate: 0.1,
    tracePropagationTargets: ['https://api.star-sign.pl/api', /^\/api/],
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
