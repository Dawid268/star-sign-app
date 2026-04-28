export default {
  routes: [
    {
      method: 'POST',
      path: '/newsletter/subscribe',
      handler: 'newsletter.subscribe',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/newsletter/confirm/:token',
      handler: 'newsletter.confirm',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/newsletter/unsubscribe',
      handler: 'newsletter.unsubscribe',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/newsletter/unsubscribe/:token',
      handler: 'newsletter.unsubscribe',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/newsletter/brevo-webhook',
      handler: 'newsletter.brevoWebhook',
      config: {
        auth: false,
      },
    },
  ],
};
