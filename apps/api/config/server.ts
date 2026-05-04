import type { Core } from '@strapi/strapi';
import { validateProductionEnv } from './env-validation';

const config = ({
  env,
}: Core.Config.Shared.ConfigParams): Core.Config.Server => {
  validateProductionEnv(process.env);

  return {
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    url: env('SERVER_URL', ''),
    app: {
      keys: env.array('APP_KEYS'),
    },
  };
};

export default config;
