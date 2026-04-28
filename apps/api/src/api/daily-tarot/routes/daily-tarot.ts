export default {
  routes: [
    {
      method: 'GET',
      path: '/daily-tarot/today',
      handler: 'daily-tarot.today',
      config: {
        auth: false,
      },
    },
  ],
};
