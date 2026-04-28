import type { Core } from '@strapi/strapi';

const destroy = ({ strapi }: { strapi: Core.Strapi }): void => {
  try {
    strapi.cron.remove('ai-content-orchestrator-minute-tick');
  } catch {
    // ignore
  }
};

export default destroy;
