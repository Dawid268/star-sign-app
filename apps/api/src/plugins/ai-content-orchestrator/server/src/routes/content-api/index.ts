export default () => ({
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/homepage/recommendations',
      handler: 'homepage.publicRecommendations',
      config: {
        auth: false,
      },
    },
  ],
});
