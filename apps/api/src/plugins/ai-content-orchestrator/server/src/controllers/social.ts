import type { Context } from 'koa';

import type { Strapi } from '../types';
import { toSafeErrorMessage } from '../utils/json';

const socialController = ({ strapi }: { strapi: Strapi }) => ({
  async listTickets(ctx: Context): Promise<void> {
    try {
      const platform = typeof ctx.query.platform === 'string' ? ctx.query.platform : undefined;
      const status = typeof ctx.query.status === 'string' ? ctx.query.status : undefined;
      const workflowId = Number(ctx.query.workflowId);
      const page = Number(ctx.query.page ?? 1);
      const limit = Number(ctx.query.limit ?? 50);

      const tickets = await strapi
        .plugin('ai-content-orchestrator')
        .service('social-publisher')
        .listTickets({
          platform,
          status,
          workflowId: Number.isFinite(workflowId) ? workflowId : undefined,
          page,
          limit,
        });

      ctx.body = { data: tickets };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },

  async testConnection(ctx: Context): Promise<void> {
    try {
      const body = (ctx.request.body ?? {}) as { workflowId?: number; channels?: unknown };
      const workflowId = Number(body.workflowId);

      if (!Number.isFinite(workflowId)) {
        ctx.badRequest('Wymagane pole: workflowId (number).');
        return;
      }

      const result = await strapi
        .plugin('ai-content-orchestrator')
        .service('social-publisher')
        .testConnection({ workflowId, channels: body.channels });

      ctx.body = { data: result };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },

  async dryRun(ctx: Context): Promise<void> {
    try {
      const body = (ctx.request.body ?? {}) as {
        workflowId?: number;
        channels?: unknown;
        caption?: string;
        mediaUrl?: string;
        targetUrl?: string;
      };
      const workflowId = Number(body.workflowId);

      if (!Number.isFinite(workflowId)) {
        ctx.badRequest('Wymagane pole: workflowId (number).');
        return;
      }

      const result = await strapi
        .plugin('ai-content-orchestrator')
        .service('social-publisher')
        .dryRunPublish({
          workflowId,
          channels: body.channels,
          caption: body.caption,
          mediaUrl: body.mediaUrl,
          targetUrl: body.targetUrl,
        });

      ctx.body = { data: result };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },

  async retryTicket(ctx: Context): Promise<void> {
    try {
      const id = Number(ctx.params.id);
      if (!Number.isFinite(id)) {
        ctx.badRequest('Niepoprawny identyfikator ticketu social.');
        return;
      }

      const ticket = await strapi
        .plugin('ai-content-orchestrator')
        .service('social-publisher')
        .retryTicket(id);
      ctx.body = { data: ticket };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },

  async cancelTicket(ctx: Context): Promise<void> {
    try {
      const id = Number(ctx.params.id);
      if (!Number.isFinite(id)) {
        ctx.badRequest('Niepoprawny identyfikator ticketu social.');
        return;
      }

      const ticket = await strapi
        .plugin('ai-content-orchestrator')
        .service('social-publisher')
        .cancelTicket(id);
      ctx.body = { data: ticket };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },
});

export default socialController;
