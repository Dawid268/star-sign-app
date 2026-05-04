import { PLUGIN_ID } from '../constants';

export const pluginActions = [
  {
    section: 'plugins',
    displayName: 'Read',
    uid: 'read',
    subCategory: 'general',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Manage workflows',
    uid: 'manage-workflows',
    subCategory: 'workflows',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Run workflows',
    uid: 'run',
    subCategory: 'workflows',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Backfill workflows',
    uid: 'backfill',
    subCategory: 'workflows',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Manage topic queue',
    uid: 'manage-topics',
    subCategory: 'topics',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'View runs and errors',
    uid: 'view-runs',
    subCategory: 'runs',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Manage media catalog',
    uid: 'manage-media',
    subCategory: 'media',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'View media usage',
    uid: 'view-media-usage',
    subCategory: 'media',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Manage social publishing',
    uid: 'manage-social',
    subCategory: 'social',
    pluginName: PLUGIN_ID,
  },
  {
    section: 'plugins',
    displayName: 'Run production audit',
    uid: 'run-audit',
    subCategory: 'audit',
    pluginName: PLUGIN_ID,
  },
] as const;
