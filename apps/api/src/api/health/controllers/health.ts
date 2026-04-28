const startedAt = new Date();

const checkDatabase = async (): Promise<boolean> => {
  try {
    await strapi.db.connection.raw('select 1 as ok');
    return true;
  } catch (error) {
    strapi.log.error('Healthcheck database probe failed.', error);
    return false;
  }
};

export default {
  async live(ctx) {
    ctx.body = {
      status: 'ok',
      service: 'star-sign-api',
      startedAt: startedAt.toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  },

  async ready(ctx) {
    const database = await checkDatabase();
    ctx.status = database ? 200 : 503;
    ctx.body = {
      status: database ? 'ready' : 'not_ready',
      service: 'star-sign-api',
      checks: {
        database,
      },
    };
  },
};
