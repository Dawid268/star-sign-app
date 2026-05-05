import type { Context } from 'koa';

import { WORKFLOW_UID } from '../constants';
import type { Strapi, WorkflowUpdatePayload } from '../types';
import { recordAdminAuditEvent } from '../utils/audit-trail';
import { toSafeErrorMessage } from '../utils/json';

const workflowsController = ({ strapi }: { strapi: Strapi }) => ({
  async find(ctx: Context): Promise<void> {
    const workflows = await strapi.plugin('ai-content-orchestrator').service('workflows').list();

    ctx.body = { data: workflows };
  },

  async create(ctx: Context): Promise<void> {
    try {
      const payload = (ctx.request.body ?? {}) as WorkflowUpdatePayload;
      const created = await strapi
        .plugin('ai-content-orchestrator')
        .service('workflows')
        .create(payload);

      await recordAdminAuditEvent(strapi, ctx, {
        action: 'workflow.create',
        outcome: 'success',
        resourceUid: WORKFLOW_UID,
        resourceId: created.id,
        resourceLabel: created.name,
        metadata: { workflowType: created.workflow_type, enabled: created.enabled },
      });
      ctx.body = { data: created };
    } catch (error) {
      const message = toSafeErrorMessage(error);
      await recordAdminAuditEvent(strapi, ctx, {
        action: 'workflow.create',
        outcome: 'failure',
        severity: 'error',
        resourceUid: WORKFLOW_UID,
        metadata: { error: message },
      });
      ctx.badRequest(message);
    }
  },

  async update(ctx: Context): Promise<void> {
    try {
      const id = Number(ctx.params.id);

      if (!Number.isFinite(id)) {
        ctx.badRequest('Niepoprawny identyfikator workflow.');
        return;
      }

      const payload = (ctx.request.body ?? {}) as WorkflowUpdatePayload;
      const updated = await strapi
        .plugin('ai-content-orchestrator')
        .service('workflows')
        .update(id, payload);

      await recordAdminAuditEvent(strapi, ctx, {
        action: 'workflow.update',
        outcome: 'success',
        resourceUid: WORKFLOW_UID,
        resourceId: id,
        resourceLabel: updated.name,
        metadata: {
          changedFields: Object.keys(payload),
          workflowType: updated.workflow_type,
          enabled: updated.enabled,
        },
      });
      ctx.body = { data: updated };
    } catch (error) {
      const message = toSafeErrorMessage(error);
      await recordAdminAuditEvent(strapi, ctx, {
        action: 'workflow.update',
        outcome: 'failure',
        severity: 'error',
        resourceUid: WORKFLOW_UID,
        resourceId: ctx.params.id,
        metadata: { error: message },
      });
      ctx.badRequest(message);
    }
  },

  async delete(ctx: Context): Promise<void> {
    try {
      const id = Number(ctx.params.id);

      if (!Number.isFinite(id)) {
        ctx.badRequest('Niepoprawny identyfikator workflow.');
        return;
      }

      const deleted = await strapi
        .plugin('ai-content-orchestrator')
        .service('workflows')
        .remove(id);

      await recordAdminAuditEvent(strapi, ctx, {
        action: 'workflow.delete',
        outcome: 'success',
        resourceUid: WORKFLOW_UID,
        resourceId: id,
        metadata: { deleted: true },
      });
      ctx.body = { data: deleted };
    } catch (error) {
      const message = toSafeErrorMessage(error);
      await recordAdminAuditEvent(strapi, ctx, {
        action: 'workflow.delete',
        outcome: 'failure',
        severity: 'error',
        resourceUid: WORKFLOW_UID,
        resourceId: ctx.params.id,
        metadata: { error: message },
      });
      ctx.badRequest(message);
    }
  },

  async runNow(ctx: Context): Promise<void> {
    try {
      const id = Number(ctx.params.id);

      if (!Number.isFinite(id)) {
        ctx.badRequest('Niepoprawny identyfikator workflow.');
        return;
      }

      await strapi.plugin('ai-content-orchestrator').service('workflows').getByIdOrThrow(id);

      void strapi
        .plugin('ai-content-orchestrator')
        .service('orchestrator')
        .runNow(id, 'manual-button')
        .catch((error: unknown) => {
          const message = toSafeErrorMessage(error);
          if (message !== 'Workflow zatrzymany ręcznie.') {
            strapi.log.error(`[aico] manual run-now for workflow #${id} failed: ${message}`);
          }
        });

      ctx.body = {
        data: {
          workflowId: id,
          queued: true,
          reason: 'manual-button',
        },
      };
      await recordAdminAuditEvent(strapi, ctx, {
        action: 'workflow.run-now',
        outcome: 'success',
        resourceUid: WORKFLOW_UID,
        resourceId: id,
        metadata: { queued: true, reason: 'manual-button' },
      });
    } catch (error) {
      const message = toSafeErrorMessage(error);
      await recordAdminAuditEvent(strapi, ctx, {
        action: 'workflow.run-now',
        outcome: 'failure',
        severity: 'error',
        resourceUid: WORKFLOW_UID,
        resourceId: ctx.params.id,
        metadata: { error: message },
      });
      ctx.badRequest(message);
    }
  },

  async stop(ctx: Context): Promise<void> {
    try {
      const id = Number(ctx.params.id);

      if (!Number.isFinite(id)) {
        ctx.badRequest('Niepoprawny identyfikator workflow.');
        return;
      }

      await strapi.plugin('ai-content-orchestrator').service('workflows').getByIdOrThrow(id);

      const result = await strapi
        .plugin('ai-content-orchestrator')
        .service('orchestrator')
        .stop(id);

      await recordAdminAuditEvent(strapi, ctx, {
        action: 'workflow.stop',
        outcome: 'success',
        resourceUid: WORKFLOW_UID,
        resourceId: id,
        metadata: result,
      });
      ctx.body = { data: result };
    } catch (error) {
      const message = toSafeErrorMessage(error);
      await recordAdminAuditEvent(strapi, ctx, {
        action: 'workflow.stop',
        outcome: 'failure',
        severity: 'error',
        resourceUid: WORKFLOW_UID,
        resourceId: ctx.params.id,
        metadata: { error: message },
      });
      ctx.badRequest(message);
    }
  },

  async backfill(ctx: Context): Promise<void> {
    try {
      const id = Number(ctx.params.id);

      if (!Number.isFinite(id)) {
        ctx.badRequest('Niepoprawny identyfikator workflow.');
        return;
      }

      const body = (ctx.request.body ?? {}) as {
        startDate?: string;
        endDate?: string;
        dryRun?: boolean;
      };

      if (!body.startDate || !body.endDate) {
        ctx.badRequest('Wymagane pola: startDate i endDate (YYYY-MM-DD).');
        return;
      }

      const result = await strapi
        .plugin('ai-content-orchestrator')
        .service('orchestrator')
        .backfill(id, {
          startDate: body.startDate,
          endDate: body.endDate,
          dryRun: Boolean(body.dryRun),
        });

      await recordAdminAuditEvent(strapi, ctx, {
        action: 'workflow.backfill',
        outcome: 'success',
        resourceUid: WORKFLOW_UID,
        resourceId: id,
        metadata: {
          startDate: body.startDate,
          endDate: body.endDate,
          dryRun: Boolean(body.dryRun),
          result,
        },
      });
      ctx.body = { data: result };
    } catch (error) {
      const message = toSafeErrorMessage(error);
      await recordAdminAuditEvent(strapi, ctx, {
        action: 'workflow.backfill',
        outcome: 'failure',
        severity: 'error',
        resourceUid: WORKFLOW_UID,
        resourceId: ctx.params.id,
        metadata: { error: message },
      });
      ctx.badRequest(message);
    }
  },
});

export default workflowsController;
