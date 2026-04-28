import { PLUGIN_ID } from '../constants';
import type { Strapi } from '../types';

export const getPluginService = <T>(strapi: Strapi, name: string): T => {
  return strapi.plugin(PLUGIN_ID).service(name) as T;
};
