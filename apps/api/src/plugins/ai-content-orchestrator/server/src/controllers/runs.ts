import type { Context } from 'koa';

import { RUN_LOG_UID } from '../constants';
import type { Strapi } from '../types';
import { recordAdminAuditEvent } from '../utils/audit-trail';
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

      await recordAdminAuditEvent(strapi, ctx, {
        action: 'run.retry',
        outcome: 'success',
        resourceUid: RUN_LOG_UID,
        resourceId: id,
        metadata: result,
      });
      ctx.body = { data: result };
    } catch (error) {
      const message = toSafeErrorMessage(error);
      await recordAdminAuditEvent(strapi, ctx, {
        action: 'run.retry',
        outcome: 'failure',
        severity: 'error',
        resourceUid: RUN_LOG_UID,
        resourceId: ctx.params.id,
        metadata: { error: message },
      });
      ctx.badRequest(message);
    }
  },
});

export default runsController;
