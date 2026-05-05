import type { Context } from 'koa';

import { DEFAULT_TIMEZONE } from '../constants';
import type { Strapi } from '../types';
import { recordAdminAuditEvent } from '../utils/audit-trail';
import { toSafeErrorMessage } from '../utils/json';

const settingsController = ({ strapi }: { strapi: Strapi }) => ({
  async find(ctx: Context): Promise<void> {
    const store = strapi.store({
      type: 'plugin',
      name: 'ai-content-orchestrator',
      key: 'settings',
    });
    const saved = ((await store.get()) as Record<string, unknown> | null) ?? {};

    ctx.body = {
      data: {
        timezone: (saved.timezone as string) || DEFAULT_TIMEZONE,
        locale: (saved.locale as string) || 'pl',
        image_gen_model: (saved.image_gen_model as string) || 'openai/gpt-image-2',
        has_image_gen_token: Boolean(saved.image_gen_api_token_encrypted),
        aico_auto_publish_enabled: saved.aico_auto_publish_enabled !== false,
        aico_strategy_autopilot_enabled: saved.aico_strategy_autopilot_enabled === true,
      },
    };
  },

  async update(ctx: Context): Promise<void> {
    try {
      const body = (ctx.request.body ?? {}) as {
        timezone?: string;
        locale?: string;
        image_gen_model?: string;
        imageGenApiToken?: string;
        aico_auto_publish_enabled?: boolean;
        aico_strategy_autopilot_enabled?: boolean;
      };
      const store = strapi.store({
        type: 'plugin',
        name: 'ai-content-orchestrator',
        key: 'settings',
      });
      const saved = ((await store.get()) as Record<string, unknown> | null) ?? {};

      let image_gen_api_token_encrypted = saved.image_gen_api_token_encrypted;
      if (body.imageGenApiToken && body.imageGenApiToken.trim()) {
        image_gen_api_token_encrypted = strapi
          .plugin('ai-content-orchestrator')
          .service('encryption')
          .encrypt(body.imageGenApiToken);
      }

      const newValue = {
        timezone: body.timezone || DEFAULT_TIMEZONE,
        locale: body.locale || 'pl',
        image_gen_model: body.image_gen_model || 'openai/gpt-image-2',
        image_gen_api_token_encrypted,
        aico_auto_publish_enabled:
          typeof body.aico_auto_publish_enabled === 'boolean'
            ? body.aico_auto_publish_enabled
            : saved.aico_auto_publish_enabled !== false,
        aico_strategy_autopilot_enabled:
          typeof body.aico_strategy_autopilot_enabled === 'boolean'
            ? body.aico_strategy_autopilot_enabled
            : saved.aico_strategy_autopilot_enabled === true,
      };

      await store.set({ value: newValue });

      await recordAdminAuditEvent(strapi, ctx, {
        action: 'settings.update',
        outcome: 'success',
        metadata: {
          changedFields: Object.keys(body).filter((key) => key !== 'imageGenApiToken'),
          imageTokenUpdated: Boolean(body.imageGenApiToken && body.imageGenApiToken.trim()),
          aicoAutoPublishEnabled: newValue.aico_auto_publish_enabled,
          aicoStrategyAutopilotEnabled: newValue.aico_strategy_autopilot_enabled,
        },
      });
      ctx.body = {
        data: {
          timezone: newValue.timezone,
          locale: newValue.locale,
          image_gen_model: newValue.image_gen_model,
          has_image_gen_token: Boolean(image_gen_api_token_encrypted),
          aico_auto_publish_enabled: newValue.aico_auto_publish_enabled,
          aico_strategy_autopilot_enabled: newValue.aico_strategy_autopilot_enabled,
        },
      };
    } catch (error) {
      const message = toSafeErrorMessage(error);
      await recordAdminAuditEvent(strapi, ctx, {
        action: 'settings.update',
        outcome: 'failure',
        severity: 'error',
        metadata: { error: message },
      });
      ctx.badRequest(message);
    }
  },
});

export default settingsController;
