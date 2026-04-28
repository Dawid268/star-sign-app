import type { Context } from 'koa';

import type { Strapi } from '../types';
import { toSafeErrorMessage } from '../utils/json';

const runsController = ({ strapi }: { strapi: Strapi }) => ({
  async find(ctx: Context): Promise<void> {
    const limit = Math.max(1, Math.min(200, Number(ctx.query.limit ?? 50)));
    const runs = await strapi.plugin('ai-content-orchestrator').service('runs').list(limit);

    ctx.body = { data: runs };
  },

  async retry(ctx: Context): Promise<void> {
    try {
      const id = Number(ctx.params.id);

      if (!Number.isFinite(id)) {
        ctx.badRequest('Niepoprawny identyfikator runa.');
        return;
      }

      const result = await strapi.plugin('ai-content-orchestrator').service('runs').retry(id);

      ctx.body = { data: result };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },
});

export default runsController;
