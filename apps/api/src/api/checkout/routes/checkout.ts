export default {
  routes: [
    {
      method: 'POST',
      path: '/checkout/session',
      handler: 'checkout.createSession',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/checkout/session/:sessionId/analytics-summary',
      handler: 'checkout.analyticsSummary',
      config: {
        auth: false,
      },
    },
  ],
};
