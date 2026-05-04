import type { HttpCacheConfig } from '../utils/http-cache';
import {
  buildHttpCacheControl,
  buildHttpCacheVary,
  buildHttpCacheKey,
  buildPrivateHttpCacheControl,
  createRedisCacheClient,
  getHttpCachePolicyForPath,
  readHttpCacheTagVersion,
  shouldBypassHttpCache,
} from '../utils/http-cache';

type HttpCacheContext = {
  method?: string;
  path?: string;
  querystring?: string;
  status: number;
  body: unknown;
  get: (name: string) => string;
  set: (name: string, value: string) => void;
  response?: {
    get?: (name: string) => string;
  };
};

type Next = () => Promise<void>;

type CachedResponse = {
  status: number;
  body: unknown;
};

const setCacheHeaders = (
  ctx: HttpCacheContext,
  cacheState: 'HIT' | 'MISS' | 'BYPASS',
  cacheControl?: string,
  vary = buildHttpCacheVary(),
): void => {
  ctx.set('X-Star-Sign-Cache', cacheState);

  if (cacheControl) {
    ctx.set('Cache-Control', cacheControl);
    ctx.set('Vary', vary);
  }
};

export default (config: HttpCacheConfig) => {
  const redis = config.enabled
    ? createRedisCacheClient(config.redisUrl)
    : undefined;

  return async (ctx: HttpCacheContext, next: Next): Promise<void> => {
    const path = ctx.path || '';
    const policy = getHttpCachePolicyForPath(path, config.policies);

    if (!config.enabled || !policy) {
      await next();
      return;
    }

    const cacheControl = buildHttpCacheControl(policy);
    const authorization = ctx.get('authorization');
    const cookie = ctx.get('cookie');
    const personalizedContext =
      Boolean(authorization?.trim()) || Boolean(cookie?.trim());
    const shouldBypass = shouldBypassHttpCache({
      method: ctx.method,
      authorization,
      cookie,
    });

    if (!redis || shouldBypass) {
      setCacheHeaders(
        ctx,
        'BYPASS',
        personalizedContext ? buildPrivateHttpCacheControl() : cacheControl,
        buildHttpCacheVary(personalizedContext),
      );
      await next();
      return;
    }

    let cacheKey: string;
    try {
      const tagVersion = await readHttpCacheTagVersion(
        redis,
        config.keyPrefix,
        policy.tag,
      );
      cacheKey = buildHttpCacheKey({
        keyPrefix: config.keyPrefix,
        method: ctx.method || 'GET',
        path,
        querystring: ctx.querystring || '',
        tag: policy.tag,
        tagVersion,
      });
      const cached = await redis.get(cacheKey);

      if (cached) {
        const payload = JSON.parse(cached) as CachedResponse;
        ctx.status = payload.status;
        ctx.body = payload.body;
        setCacheHeaders(ctx, 'HIT', cacheControl);
        return;
      }
    } catch {
      setCacheHeaders(ctx, 'BYPASS', cacheControl);
      await next();
      return;
    }

    await next();
    setCacheHeaders(ctx, 'MISS', cacheControl);

    const setCookie = ctx.response?.get?.('set-cookie');
    if (ctx.status === 200 && ctx.body !== undefined && !setCookie) {
      try {
        await redis.set(
          cacheKey,
          JSON.stringify({
            status: ctx.status,
            body: ctx.body,
          } satisfies CachedResponse),
          'PX',
          String(policy.ttlSeconds * 1000),
        );
      } catch {
        return;
      }
    }
  };
};
