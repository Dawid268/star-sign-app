export default {
  routes: [
    {
      method: 'GET',
      path: '/app-settings/public',
      handler: 'app-setting.findPublic',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
