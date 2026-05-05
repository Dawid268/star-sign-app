import type { Context } from 'koa';

import { CONTENT_PERFORMANCE_SNAPSHOT_UID } from '../constants';
import type { Strapi } from '../types';
import { recordAdminAuditEvent } from '../utils/audit-trail';
import { toSafeErrorMessage } from '../utils/json';

const performanceController = ({ strapi }: { strapi: Strapi }) => ({
  async find(ctx: Context): Promise<void> {
    try {
      const limit = Number(ctx.query.limit ?? 100);
      const snapshots = await strapi
        .plugin('ai-content-orchestrator')
        .service('performance-feedback')
        .list({
          limit: Number.isFinite(limit) ? limit : undefined,
        });

      ctx.body = { data: snapshots };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },

  async aggregate(ctx: Context): Promise<void> {
    try {
      const body = (ctx.request.body ?? {}) as {
        day?: string;
        limit?: number;
      };
      const result = await strapi
        .plugin('ai-content-orchestrator')
        .service('performance-feedback')
        .aggregate({
          day: body.day,
          limit: body.limit,
        });

      await recordAdminAuditEvent(strapi, ctx, {
        action: 'performance.aggregate',
        outcome: 'success',
        resourceUid: CONTENT_PERFORMANCE_SNAPSHOT_UID,
        metadata: {
          day: result.day,
          requestedDay: body.day,
          requestedLimit: body.limit,
          processed: result.processed,
        },
      });
      ctx.body = { data: result };
    } catch (error) {
      const message = toSafeErrorMessage(error);
      await recordAdminAuditEvent(strapi, ctx, {
        action: 'performance.aggregate',
        outcome: 'failure',
        severity: 'error',
        resourceUid: CONTENT_PERFORMANCE_SNAPSHOT_UID,
        metadata: { error: message },
      });
      ctx.badRequest(message);
    }
  },
});

export default performanceController;
