import type { Core } from '@strapi/strapi';
import { describe, expect, it } from 'vitest';

import middlewaresConfig from '../../config/middlewares';

type StrapiEnv = Core.Config.Shared.ConfigParams['env'];
type MiddlewareEntry = string | { name?: string; config?: unknown };
type CorsMiddleware = {
  name: 'strapi::cors';
  config: {
    origin: string[];
    headers: string[];
    keepHeadersOnError: boolean;
  };
};

const truthyValues = ['1', 'true', 'yes', 'on'];

const createEnv = (values: Record<string, string> = {}): StrapiEnv => {
  const env = ((key: string, defaultValue?: string): string =>
    values[key] ?? defaultValue ?? '') as StrapiEnv;

  env.bool = (key: string, defaultValue?: boolean): boolean => {
    const value = values[key];
    if (value === undefined || value === '') {
      return defaultValue ?? false;
    }
    return truthyValues.includes(value.toLowerCase());
  };

  env.int = (key: string, defaultValue?: number): number => {
    const value = values[key];
    if (value === undefined || value === '') {
      return defaultValue ?? 0;
    }
    return Number.parseInt(value, 10);
  };

  return env;
};

const getCorsConfig = (
  values: Record<string, string> = {},
): CorsMiddleware['config'] => {
  const middlewares = middlewaresConfig({
    env: createEnv(values),
  } as Core.Config.Shared.ConfigParams) as MiddlewareEntry[];

  const corsMiddleware = middlewares.find(
    (entry): entry is CorsMiddleware =>
      typeof entry !== 'string' && entry.name === 'strapi::cors',
  );

  if (!corsMiddleware) {
    throw new Error('strapi::cors middleware was not configured');
  }

  return corsMiddleware.config;
};

describe('middlewares CORS config', () => {
  it('allows browser headers used by authenticated API requests', () => {
    expect(getCorsConfig().headers).toEqual(
      expect.arrayContaining([
        'Authorization',
        'Cache-Control',
        'Pragma',
        'Sentry-Trace',
        'Baggage',
        'Stripe-Signature',
      ]),
    );
  });

  it('keeps CORS headers on error responses', () => {
    expect(getCorsConfig().keepHeadersOnError).toBe(true);
  });

  it('adds local dev origins outside production', () => {
    expect(
      getCorsConfig({ CORS_ORIGIN: 'http://localhost:4200' }).origin,
    ).toEqual(
      expect.arrayContaining([
        'http://localhost:4200',
        'http://127.0.0.1:4200',
        'http://localhost:4300',
        'http://127.0.0.1:4300',
      ]),
    );
  });

  it('does not append local dev origins in production', () => {
    expect(
      getCorsConfig({
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://star-sign.pl',
      }).origin,
    ).toEqual(['https://star-sign.pl']);
  });
});
