import type { Context } from 'koa';

import type { MediaPeriodScope, MediaPurpose, Strapi } from '../types';
import { toSafeErrorMessage } from '../utils/json';

const mediaAssetsController = ({ strapi }: { strapi: Strapi }) => ({
  async find(ctx: Context): Promise<void> {
    const rows = await strapi.plugin('ai-content-orchestrator').service('media-assets').list();
    const data = rows.map((item: Record<string, unknown>) =>
      strapi.plugin('ai-content-orchestrator').service('media-assets').serialize(item)
    );

    ctx.body = { data };
  },

  async create(ctx: Context): Promise<void> {
    try {
      const created = await strapi
        .plugin('ai-content-orchestrator')
        .service('media-assets')
        .create((ctx.request.body ?? {}) as Record<string, unknown>);

      const serialized = strapi
        .plugin('ai-content-orchestrator')
        .service('media-assets')
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
        ctx.badRequest('Niepoprawny identyfikator media-asset.');
        return;
      }

      const updated = await strapi
        .plugin('ai-content-orchestrator')
        .service('media-assets')
        .update(id, (ctx.request.body ?? {}) as Record<string, unknown>);

      const serialized = strapi
        .plugin('ai-content-orchestrator')
        .service('media-assets')
        .serialize(updated);
      ctx.body = { data: serialized };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },

  async bulkUpsert(ctx: Context): Promise<void> {
    try {
      const body = (ctx.request.body ?? {}) as {
        items?: Array<Record<string, unknown>>;
        dryRun?: boolean;
        apply?: boolean;
      };

      const result = await strapi
        .plugin('ai-content-orchestrator')
        .service('media-assets')
        .bulkUpsert({
          items: Array.isArray(body.items) ? body.items : [],
          dryRun: body.dryRun,
          apply: body.apply,
        });

      ctx.body = { data: result };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },

  async previewIdentity(ctx: Context): Promise<void> {
    try {
      const body = (ctx.request.body ?? {}) as Record<string, unknown>;
      const purpose =
        typeof body.purpose === 'string' ? (body.purpose as MediaPurpose) : 'blog_article';
      const periodScope =
        typeof body.period_scope === 'string' ? (body.period_scope as MediaPeriodScope) : 'any';
      const result = await strapi
        .plugin('ai-content-orchestrator')
        .service('media-assets')
        .previewIdentity({
          fileId: Number(body.fileId),
          purpose,
          sign_slug: typeof body.sign_slug === 'string' ? body.sign_slug : null,
          period_scope: periodScope,
          excludeId: typeof body.excludeId === 'number' ? body.excludeId : null,
        });

      ctx.body = { data: result };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },

  async validateCoverage(ctx: Context): Promise<void> {
    try {
      const body = (ctx.request.body ?? {}) as { applyWorkflowDisabling?: boolean };
      const result = await strapi
        .plugin('ai-content-orchestrator')
        .service('media-assets')
        .validateCoverage({
          applyWorkflowDisabling: Boolean(body.applyWorkflowDisabling),
        });

      ctx.body = { data: result };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },
});

export default mediaAssetsController;
