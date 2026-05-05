import type { Context } from 'koa';

import { HOMEPAGE_RECOMMENDATION_UID } from '../constants';
import type { HomepageRecommendationRecord, Strapi } from '../types';
import { recordAdminAuditEvent } from '../utils/audit-trail';
import { toSafeErrorMessage } from '../utils/json';

const homepageController = ({ strapi }: { strapi: Strapi }) => ({
  async publicRecommendations(ctx: Context): Promise<void> {
    try {
      const limit = Number(ctx.query.limit ?? 12);
      const recommendations = await strapi
        .plugin('ai-content-orchestrator')
        .service('site-alive')
        .listPublic({
          status: 'active',
          limit: Number.isFinite(limit) ? limit : undefined,
        });

      ctx.body = { data: recommendations };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },

  async findRecommendations(ctx: Context): Promise<void> {
    try {
      const status =
        typeof ctx.query.status === 'string'
          ? (ctx.query.status as HomepageRecommendationRecord['status'])
          : undefined;
      const limit = Number(ctx.query.limit ?? 20);
      const recommendations = await strapi
        .plugin('ai-content-orchestrator')
        .service('site-alive')
        .list({
          status,
          limit: Number.isFinite(limit) ? limit : undefined,
        });

      ctx.body = { data: recommendations };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },

  async runRecommendations(ctx: Context): Promise<void> {
    try {
      const body = (ctx.request.body ?? {}) as {
        ttlHours?: number;
        limit?: number;
      };
      const result = await strapi
        .plugin('ai-content-orchestrator')
        .service('site-alive')
        .runRecommendations({
          ttlHours: body.ttlHours,
          limit: body.limit,
        });

      await recordAdminAuditEvent(strapi, ctx, {
        action: 'homepage.recommendations.run',
        outcome: 'success',
        resourceUid: HOMEPAGE_RECOMMENDATION_UID,
        metadata: {
          ttlHours: body.ttlHours,
          limit: body.limit,
          result,
        },
      });
      ctx.body = { data: result };
    } catch (error) {
      const message = toSafeErrorMessage(error);
      await recordAdminAuditEvent(strapi, ctx, {
        action: 'homepage.recommendations.run',
        outcome: 'failure',
        severity: 'error',
        resourceUid: HOMEPAGE_RECOMMENDATION_UID,
        metadata: { error: message },
      });
      ctx.badRequest(message);
    }
  },
});

export default homepageController;
