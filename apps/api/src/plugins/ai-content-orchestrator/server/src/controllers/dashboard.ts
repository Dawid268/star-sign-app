import type { Context } from 'koa';

import type { Strapi } from '../types';

const dashboardController = ({ strapi }: { strapi: Strapi }) => ({
  async index(ctx: Context): Promise<void> {
    const summary = await strapi
      .plugin('ai-content-orchestrator')
      .service('dashboard')
      .getSummary();
    ctx.body = { data: summary };
  },
});

export default dashboardController;
