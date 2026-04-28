import type { Context } from 'koa';

import type { Strapi } from '../types';

const mediaUsageController = ({ strapi }: { strapi: Strapi }) => ({
  async find(ctx: Context): Promise<void> {
    const rawLimit = Number(ctx.query.limit);
    const limit = Number.isFinite(rawLimit) ? rawLimit : 200;

    const rows = await strapi.plugin('ai-content-orchestrator').service('media-usage').list(limit);
    const data = rows.map((item: Record<string, unknown>) =>
      strapi.plugin('ai-content-orchestrator').service('media-usage').serialize(item)
    );

    ctx.body = { data };
  },
});

export default mediaUsageController;
