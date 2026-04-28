import type { Core } from '@strapi/strapi';
import { isShopEnabled } from './features';

type PermissionAction = {
  enabled?: boolean;
};

type PermissionController = Record<string, PermissionAction>;

type PermissionNamespace = {
  controllers?: Record<string, PermissionController>;
};

type RoleWithPermissions = {
  id: number;
  name: string;
  description?: string;
  permissions: Record<string, PermissionNamespace>;
};

const BASE_PUBLIC_READ_ACTIONS = [
  'api::article.article.find',
  'api::article.article.findOne',
  'api::category.category.find',
  'api::category.category.findOne',
  'api::horoscope.horoscope.find',
  'api::horoscope.horoscope.findOne',
  'api::numerology-profile.numerology-profile.find',
  'api::numerology-profile.numerology-profile.findOne',
  'api::tarot-card.tarot-card.find',
  'api::tarot-card.tarot-card.findOne',
  'api::zodiac-sign.zodiac-sign.find',
  'api::zodiac-sign.zodiac-sign.findOne',
];

const SHOP_PUBLIC_READ_ACTIONS = ['api::product.product.find', 'api::product.product.findOne'];
const MANAGED_PUBLIC_READ_ACTIONS = [...BASE_PUBLIC_READ_ACTIONS, ...SHOP_PUBLIC_READ_ACTIONS];
const READ_ROLE_TYPES = ['public', 'authenticated'];

const setPermission = (
  permissions: Record<string, PermissionNamespace>,
  actionId: string,
  enabled: boolean
): boolean => {
  const [typeName, controllerName, actionName] = actionId.split('.');
  const action = permissions[typeName]?.controllers?.[controllerName]?.[actionName];

  if (!action) {
    return false;
  }

  action.enabled = enabled;
  return true;
};

export const getPublicReadActions = (): string[] => [
  ...BASE_PUBLIC_READ_ACTIONS,
  ...(isShopEnabled() ? SHOP_PUBLIC_READ_ACTIONS : []),
];

export const syncContentApiReadPermissions = async (strapi: Core.Strapi): Promise<void> => {
  const roleService = strapi.plugin('users-permissions').service('role');
  const enabledActions = new Set(getPublicReadActions());

  for (const roleType of READ_ROLE_TYPES) {
    const dbRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: roleType },
    });

    if (!dbRole) {
      throw new Error(`Brak roli "${roleType}" w users-permissions.`);
    }

    const role = (await roleService.findOne(dbRole.id)) as RoleWithPermissions;
    const missingEnabledActions: string[] = [];

    for (const actionId of MANAGED_PUBLIC_READ_ACTIONS) {
      const exists = setPermission(role.permissions, actionId, enabledActions.has(actionId));
      if (!exists && enabledActions.has(actionId)) {
        missingEnabledActions.push(actionId);
      }
    }

    if (missingEnabledActions.length > 0) {
      throw new Error(
        `Nie znaleziono akcji dla roli "${roleType}": ${missingEnabledActions.join(', ')}`
      );
    }

    await roleService.updateRole(dbRole.id, {
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    });
  }
};
