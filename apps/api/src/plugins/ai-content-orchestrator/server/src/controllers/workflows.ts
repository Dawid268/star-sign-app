import type { Context } from 'koa';

import type { Strapi, WorkflowUpdatePayload } from '../types';
import { toSafeErrorMessage } from '../utils/json';

const workflowsController = ({ strapi }: { strapi: Strapi }) => ({
  async find(ctx: Context): Promise<void> {
    const workflows = await strapi
      .plugin('ai-content-orchestrator')
      .service('workflows')
      .list();

    ctx.body = { data: workflows };
  },

  async create(ctx: Context): Promise<void> {
    try {
      const payload = (ctx.request.body ?? {}) as WorkflowUpdatePayload;
      const created = await strapi
        .plugin('ai-content-orchestrator')
        .service('workflows')
        .create(payload);

      ctx.body = { data: created };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
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

      ctx.body = { data: updated };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
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

      ctx.body = { data: deleted };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },

  async runNow(ctx: Context): Promise<void> {
    try {
      const id = Number(ctx.params.id);

      if (!Number.isFinite(id)) {
        ctx.badRequest('Niepoprawny identyfikator workflow.');
        return;
      }

      await strapi
        .plugin('ai-content-orchestrator')
        .service('workflows')
        .getByIdOrThrow(id);

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
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },

  async stop(ctx: Context): Promise<void> {
    try {
      const id = Number(ctx.params.id);

      if (!Number.isFinite(id)) {
        ctx.badRequest('Niepoprawny identyfikator workflow.');
        return;
      }

      await strapi
        .plugin('ai-content-orchestrator')
        .service('workflows')
        .getByIdOrThrow(id);

      const result = await strapi
        .plugin('ai-content-orchestrator')
        .service('orchestrator')
        .stop(id);

      ctx.body = { data: result };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },

  async backfill(ctx: Context): Promise<void> {
    try {
      const id = Number(ctx.params.id);

      if (!Number.isFinite(id)) {
        ctx.badRequest('Niepoprawny identyfikator workflow.');
        return;
      }

      const body = (ctx.request.body ?? {}) as { startDate?: string; endDate?: string; dryRun?: boolean };

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

      ctx.body = { data: result };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },
});

export default workflowsController;
