import type { Core } from '@strapi/strapi';

import { CRON_TICK_RULE, DEFAULT_TIMEZONE, PLUGIN_ID, RBAC_ACTIONS } from './constants';
import { pluginActions } from './permissions/actions';

type PermissionService = {
  actionProvider: {
    registerMany: (actions: ReadonlyArray<Record<string, unknown>>) => Promise<void>;
  };
  createMany: (permissions: Array<Record<string, unknown>>) => Promise<unknown>;
};

const syncEditorRolePermissions = async (strapi: Core.Strapi): Promise<void> => {
  const roleCandidates = ['Editor Content', 'Content Editor', 'Editor'];

  const roles = (await strapi.db.query('admin::role').findMany({
    where: {
      name: {
        $in: roleCandidates,
      },
    },
  })) as Array<{ id: number; name: string }>;

  if (roles.length === 0) {
    return;
  }

  const targetActions = Object.values(RBAC_ACTIONS);

  for (const role of roles) {
    const existing = (await strapi.db.query('admin::permission').findMany({
      where: {
        role: role.id,
      },
    })) as Array<{ action: string }>;

    const existingActions = new Set(existing.map((item) => item.action));

    const missingPermissions = targetActions
      .filter((action) => !existingActions.has(action))
      .map((action) => ({
        action,
        actionParameters: {},
        subject: null,
        properties: {},
        conditions: [],
        role: role.id,
      }));

    if (missingPermissions.length > 0) {
      const permissionService = strapi.service('admin::permission') as unknown as PermissionService;
      await permissionService.createMany(missingPermissions);
      strapi.log.info(
        `[aico] Dodano ${missingPermissions.length} uprawnień pluginu do roli admin "${role.name}".`
      );
    }
  }
};

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }): Promise<void> => {
  try {
    const permissionService = strapi.service('admin::permission') as unknown as PermissionService;
    await permissionService.actionProvider.registerMany(pluginActions as unknown as Record<string, unknown>[]);
    await syncEditorRolePermissions(strapi);
  } catch (error) {
    strapi.log.warn(`[aico] Nie udało się zarejestrować RBAC pluginu: ${String(error)}`);
  }

  strapi.cron.add({
    'ai-content-orchestrator-minute-tick': {
      task: async () => {
        await strapi.plugin(PLUGIN_ID).service('orchestrator').tick();
      },
      options: {
        rule: CRON_TICK_RULE,
        tz: DEFAULT_TIMEZONE,
      },
    },
  });

  strapi.log.info('[aico] Plugin cron tick registered.');
};

export default bootstrap;
