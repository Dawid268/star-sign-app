import type { Context } from 'koa';

import { DEFAULT_TIMEZONE } from '../constants';
import type { Strapi } from '../types';
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
      };

      await store.set({ value: newValue });

      ctx.body = {
        data: {
          timezone: newValue.timezone,
          locale: newValue.locale,
          image_gen_model: newValue.image_gen_model,
          has_image_gen_token: Boolean(image_gen_api_token_encrypted),
        },
      };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },
});

export default settingsController;
