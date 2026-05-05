import type { Context } from 'koa';

import { CONTENT_PLAN_ITEM_UID } from '../constants';
import type { Strapi } from '../types';
import { recordAdminAuditEvent } from '../utils/audit-trail';
import { toSafeErrorMessage } from '../utils/json';

const strategyController = ({ strapi }: { strapi: Strapi }) => ({
  async listPlan(ctx: Context): Promise<void> {
    try {
      const status = typeof ctx.query.status === 'string' ? ctx.query.status : undefined;
      const limit = Number(ctx.query.limit ?? 100);
      const items = await strapi
        .plugin('ai-content-orchestrator')
        .service('strategy-planner')
        .listPlan({
          status,
          limit: Number.isFinite(limit) ? limit : undefined,
        });

      ctx.body = { data: items };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },

  async generatePlan(ctx: Context): Promise<void> {
    try {
      const body = (ctx.request.body ?? {}) as {
        weekStart?: string;
        limit?: number;
        workflowId?: number;
        autoApprove?: boolean;
      };

      const result = await strapi
        .plugin('ai-content-orchestrator')
        .service('strategy-planner')
        .generatePlan({
          weekStart: body.weekStart,
          limit: body.limit,
          workflowId: body.workflowId,
          autoApprove: body.autoApprove,
        });

      await recordAdminAuditEvent(strapi, ctx, {
        action: 'strategy.generate-plan',
        outcome: 'success',
        resourceUid: CONTENT_PLAN_ITEM_UID,
        metadata: {
          weekStart: body.weekStart,
          limit: body.limit,
          workflowId: body.workflowId,
          autoApprove: Boolean(body.autoApprove),
        },
      });
      ctx.body = { data: result };
    } catch (error) {
      const message = toSafeErrorMessage(error);
      await recordAdminAuditEvent(strapi, ctx, {
        action: 'strategy.generate-plan',
        outcome: 'failure',
        severity: 'error',
        resourceUid: CONTENT_PLAN_ITEM_UID,
        metadata: { error: message },
      });
      ctx.badRequest(message);
    }
  },

  async approvePlan(ctx: Context): Promise<void> {
    try {
      const body = (ctx.request.body ?? {}) as {
        ids?: number[];
        limit?: number;
      };

      const result = await strapi
        .plugin('ai-content-orchestrator')
        .service('strategy-planner')
        .approvePlan({
          ids: body.ids,
          limit: body.limit,
        });

      await recordAdminAuditEvent(strapi, ctx, {
        action: 'strategy.approve-plan',
        outcome: 'success',
        resourceUid: CONTENT_PLAN_ITEM_UID,
        metadata: {
          ids: body.ids,
          limit: body.limit,
          result,
        },
      });
      ctx.body = { data: result };
    } catch (error) {
      const message = toSafeErrorMessage(error);
      await recordAdminAuditEvent(strapi, ctx, {
        action: 'strategy.approve-plan',
        outcome: 'failure',
        severity: 'error',
        resourceUid: CONTENT_PLAN_ITEM_UID,
        metadata: { error: message },
      });
      ctx.badRequest(message);
    }
  },
});

export default strategyController;
