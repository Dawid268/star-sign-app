export default {
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: 'health.live',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/health/ready',
      handler: 'health.ready',
      config: {
        auth: false,
      },
    },
  ],
};
