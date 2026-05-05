import type { Context } from 'koa';

import type { Strapi } from '../types';
import { recordAdminAuditEvent } from '../utils/audit-trail';
import { toSafeErrorMessage } from '../utils/json';

const auditController = ({ strapi }: { strapi: Strapi }) => ({
  async preflight(ctx: Context): Promise<void> {
    try {
      const includeConnectivity =
        ctx.query.includeConnectivity === 'true' || ctx.query.includeConnectivity === '1';
      const result = await strapi
        .plugin('ai-content-orchestrator')
        .service('audit')
        .preflight({ strict: false, includeConnectivity });
      await recordAdminAuditEvent(strapi, ctx, {
        action: 'audit.preflight',
        outcome: 'success',
        metadata: {
          strict: false,
          includeConnectivity,
          decision: result.decision,
          summary: result.summary,
        },
      });
      ctx.body = { data: result };
    } catch (error) {
      const message = toSafeErrorMessage(error);
      await recordAdminAuditEvent(strapi, ctx, {
        action: 'audit.preflight',
        outcome: 'failure',
        severity: 'error',
        metadata: { strict: false, error: message },
      });
      ctx.badRequest(message);
    }
  },

  async preflightStrict(ctx: Context): Promise<void> {
    try {
      const strict = Boolean(
        (ctx.request.body as { strict?: boolean } | undefined)?.strict ?? true
      );
      const includeConnectivity = Boolean(
        (ctx.request.body as { includeConnectivity?: boolean } | undefined)?.includeConnectivity
      );
      const result = await strapi
        .plugin('ai-content-orchestrator')
        .service('audit')
        .preflight({ strict, includeConnectivity });
      await recordAdminAuditEvent(strapi, ctx, {
        action: 'audit.preflight.strict',
        outcome: 'success',
        metadata: {
          strict,
          includeConnectivity,
          decision: result.decision,
          summary: result.summary,
        },
      });
      ctx.body = { data: result };
    } catch (error) {
      const message = toSafeErrorMessage(error);
      await recordAdminAuditEvent(strapi, ctx, {
        action: 'audit.preflight.strict',
        outcome: 'failure',
        severity: 'error',
        metadata: { error: message },
      });
      ctx.badRequest(message);
    }
  },

  async events(ctx: Context): Promise<void> {
    try {
      const limit = Number(ctx.query.limit ?? 100);
      const resourceId =
        typeof ctx.query.resourceId === 'string' ? ctx.query.resourceId : undefined;
      const events = await strapi
        .plugin('ai-content-orchestrator')
        .service('audit-trail')
        .list({
          action: typeof ctx.query.action === 'string' ? ctx.query.action : undefined,
          outcome:
            ctx.query.outcome === 'success' ||
            ctx.query.outcome === 'failure' ||
            ctx.query.outcome === 'skipped'
              ? ctx.query.outcome
              : undefined,
          resourceUid:
            typeof ctx.query.resourceUid === 'string' ? ctx.query.resourceUid : undefined,
          resourceId,
          limit: Number.isFinite(limit) ? limit : undefined,
        });

      ctx.body = { data: events };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },
});

export default auditController;
