import type { Context } from 'koa';

import { DEFAULT_TIMEZONE } from '../constants';
import type { Strapi } from '../types';
import { toSafeErrorMessage } from '../utils/json';

const settingsController = ({ strapi }: { strapi: Strapi }) => ({
  async find(ctx: Context): Promise<void> {
    const store = strapi.store({ type: 'plugin', name: 'ai-content-orchestrator', key: 'settings' });
    const saved = ((await store.get()) as Record<string, unknown> | null) ?? {};

    ctx.body = {
      data: {
        timezone: (saved.timezone as string) || DEFAULT_TIMEZONE,
        locale: (saved.locale as string) || 'pl',
      },
    };
  },

  async update(ctx: Context): Promise<void> {
    try {
      const body = (ctx.request.body ?? {}) as { timezone?: string; locale?: string };
      const store = strapi.store({ type: 'plugin', name: 'ai-content-orchestrator', key: 'settings' });

      await store.set({
        value: {
          timezone: body.timezone || DEFAULT_TIMEZONE,
          locale: body.locale || 'pl',
        },
      });

      ctx.body = {
        data: {
          timezone: body.timezone || DEFAULT_TIMEZONE,
          locale: body.locale || 'pl',
        },
      };
    } catch (error) {
      ctx.badRequest(toSafeErrorMessage(error));
    }
  },
});

export default settingsController;
