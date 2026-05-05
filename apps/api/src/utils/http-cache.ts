import { createHash } from 'node:crypto';
import Redis from 'ioredis';

export type HttpCacheTag = 'articles' | 'horoscopes' | 'zodiac-signs';

export type HttpCachePolicy = {
  tag: HttpCacheTag;
  ttlSeconds: number;
  staleSeconds: number;
};

export type HttpCacheConfig = {
  enabled: boolean;
  redisUrl: string;
  keyPrefix: string;
  policies: Record<HttpCacheTag, HttpCachePolicy>;
};

export type RedisCommandClient = {
  get: (key: string) => Promise<string | null>;
  incr: (key: string) => Promise<number>;
};

export const defaultHttpCachePolicies: Record<HttpCacheTag, HttpCachePolicy> = {
  articles: { tag: 'articles', ttlSeconds: 300, staleSeconds: 86400 },
  horoscopes: { tag: 'horoscopes', ttlSeconds: 900, staleSeconds: 3600 },
  'zodiac-signs': {
    tag: 'zodiac-signs',
    ttlSeconds: 86400,
    staleSeconds: 604800,
  },
};

export const canonicalizeQueryString = (querystring = ''): string => {
  const params = new URLSearchParams(querystring);
  const sorted = Array.from(params.entries()).sort(
    ([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue);
      }

      return leftKey.localeCompare(rightKey);
    },
  );
  const normalized = new URLSearchParams();
  sorted.forEach(([key, value]) => normalized.append(key, value));
  return normalized.toString();
};

export const getHttpCachePolicyForPath = (
  path: string,
  policies: Record<HttpCacheTag, HttpCachePolicy> = defaultHttpCachePolicies,
): HttpCachePolicy | null => {
  if (path === '/api/articles' || path.startsWith('/api/articles/')) {
    return policies.articles;
  }

  if (path === '/api/horoscopes' || path.startsWith('/api/horoscopes/')) {
    return policies.horoscopes;
  }

  if (path === '/api/zodiac-signs' || path.startsWith('/api/zodiac-signs/')) {
    return policies['zodiac-signs'];
  }

  return null;
};

export const shouldBypassHttpCache = (input: {
  method?: string;
  authorization?: string;
  cookie?: string;
}): boolean =>
  input.method?.toUpperCase() !== 'GET' ||
  Boolean(input.authorization?.trim()) ||
  Boolean(input.cookie?.trim());

export const buildHttpCacheControl = (policy: HttpCachePolicy): string =>
  `public, max-age=60, s-maxage=${policy.ttlSeconds}, stale-while-revalidate=${policy.staleSeconds}`;

export const buildPrivateHttpCacheControl = (): string =>
  'private, no-store, max-age=0';

export const buildHttpCacheVary = (personalized = false): string =>
  personalized
    ? 'Accept, Accept-Encoding, Authorization, Cookie'
    : 'Accept, Accept-Encoding';

export const buildTagVersionKey = (
  keyPrefix: string,
  tag: HttpCacheTag,
): string => `${keyPrefix}tag:${tag}:version`;

export const readHttpCacheTagVersion = async (
  redis: RedisCommandClient,
  keyPrefix: string,
  tag: HttpCacheTag,
): Promise<string> =>
  (await redis.get(buildTagVersionKey(keyPrefix, tag))) || '1';

export const buildHttpCacheKey = (input: {
  keyPrefix: string;
  method: string;
  path: string;
  querystring: string;
  tag: HttpCacheTag;
  tagVersion: string;
}): string => {
  const canonical = JSON.stringify({
    method: input.method.toUpperCase(),
    path: input.path,
    querystring: canonicalizeQueryString(input.querystring),
    tag: input.tag,
    tagVersion: input.tagVersion,
  });
  const digest = createHash('sha256').update(canonical).digest('hex');
  return `${input.keyPrefix}response:${input.tag}:${digest}`;
};

export const createRedisCacheClient = (redisUrl: string): Redis | undefined => {
  if (!redisUrl) {
    return undefined;
  }

  const client = new Redis(redisUrl, {
    connectTimeout: 2_000,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });

  client.on('error', () => undefined);

  return client;
};

export const invalidateHttpCacheTags = async (
  tags: HttpCacheTag[],
  options: {
    enabled?: boolean;
    redis?: RedisCommandClient;
    redisUrl?: string;
    keyPrefix?: string;
  } = {},
): Promise<void> => {
  if (options.enabled === false) {
    return;
  }

  const keyPrefix =
    options.keyPrefix ||
    process.env.HTTP_CACHE_KEY_PREFIX ||
    'star-sign:http-cache:';
  const redis =
    options.redis ||
    createRedisCacheClient(
      options.redisUrl ||
        process.env.HTTP_CACHE_REDIS_URL ||
        process.env.REDIS_URL ||
        '',
    );

  if (!redis) {
    return;
  }

  try {
    await Promise.all(
      tags.map((tag) => redis.incr(buildTagVersionKey(keyPrefix, tag))),
    );
  } catch {
    return;
  }
};
