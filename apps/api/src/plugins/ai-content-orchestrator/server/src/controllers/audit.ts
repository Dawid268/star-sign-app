import type { Context } from 'koa';

import type { Strapi } from '../types';
import { toSafeErrorMessage } from '../utils/json';

const auditController = ({ strapi }: { strapi: Strapi }) => ({
  async preflight(ctx: Context): Promise<void> {
    try {
      const result = await strapi
        .plugin('ai-content-orchestrator')
        .service('audit')
        .preflight({ strict: false });
      ctx.body = { data: result };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },

  async preflightStrict(ctx: Context): Promise<void> {
    try {
      const strict = Boolean(
        (ctx.request.body as { strict?: boolean } | undefined)?.strict ?? true
      );
      const result = await strapi
        .plugin('ai-content-orchestrator')
        .service('audit')
        .preflight({ strict });
      ctx.body = { data: result };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },
});

export default auditController;
