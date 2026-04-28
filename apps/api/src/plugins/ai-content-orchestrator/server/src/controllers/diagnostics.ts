import type { Context } from 'koa';

import type { Strapi } from '../types';

const diagnosticsController = ({ strapi }: { strapi: Strapi }) => ({
  async index(ctx: Context): Promise<void> {
    const summary = await strapi.plugin('ai-content-orchestrator').service('diagnostics').getSummary();
    ctx.body = { data: summary };
  },
});

export default diagnosticsController;
