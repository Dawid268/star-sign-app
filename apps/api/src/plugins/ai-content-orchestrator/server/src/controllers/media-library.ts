import type { Context } from 'koa';

import type { Strapi } from '../types';
import { toSafeErrorMessage } from '../utils/json';

const mediaLibraryController = ({ strapi }: { strapi: Strapi }) => ({
  async find(ctx: Context): Promise<void> {
    try {
      const query = (ctx.query ?? {}) as Record<string, unknown>;
      const data = await strapi.plugin('ai-content-orchestrator').service('media-library').list({
        page: query.page,
        pageSize: query.pageSize,
        search: query.search,
        mapped: query.mapped,
        purpose: query.purpose,
        sign: query.sign,
        active: query.active,
        sort: query.sort,
      });

      ctx.body = { data };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },
});

export default mediaLibraryController;
