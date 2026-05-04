import type { Context } from 'koa';

import type { Strapi } from '../types';
import { toSafeErrorMessage } from '../utils/json';

const topicsController = ({ strapi }: { strapi: Strapi }) => ({
  async find(ctx: Context): Promise<void> {
    const topics = await strapi.plugin('ai-content-orchestrator').service('topics').list();
    const serialized = topics.map((item: Record<string, unknown>) =>
      strapi.plugin('ai-content-orchestrator').service('topics').serialize(item)
    );

    ctx.body = { data: serialized };
  },

  async create(ctx: Context): Promise<void> {
    try {
      const body = (ctx.request.body ?? {}) as {
        title?: string;
        brief?: string;
        image_asset_key?: string;
        scheduled_for?: string;
        workflow?: number;
        article_category?: number;
        metadata?: Record<string, unknown>;
      };

      const created = await strapi
        .plugin('ai-content-orchestrator')
        .service('topics')
        .create({
          title: body.title ?? '',
          brief: body.brief,
          image_asset_key: body.image_asset_key,
          scheduled_for: body.scheduled_for,
          workflow: body.workflow,
          article_category: body.article_category,
          metadata: body.metadata,
        });

      const serialized = strapi
        .plugin('ai-content-orchestrator')
        .service('topics')
        .serialize(created);
      ctx.body = { data: serialized };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },

  async update(ctx: Context): Promise<void> {
    try {
      const id = Number(ctx.params.id);

      if (!Number.isFinite(id)) {
        ctx.badRequest('Niepoprawny identyfikator tematu.');
        return;
      }

      const updated = await strapi
        .plugin('ai-content-orchestrator')
        .service('topics')
        .update(id, ctx.request.body ?? {});

      const serialized = strapi
        .plugin('ai-content-orchestrator')
        .service('topics')
        .serialize(updated);
      ctx.body = { data: serialized };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },
});

export default topicsController;
