export default {
  routes: [
    {
      method: 'POST',
      path: '/analytics/events',
      handler: 'analytics-event.track',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
