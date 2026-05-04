import { describe, expect, it, vi } from 'vitest';

import {
  buildHttpCacheControl,
  buildHttpCacheVary,
  buildHttpCacheKey,
  buildPrivateHttpCacheControl,
  buildTagVersionKey,
  canonicalizeQueryString,
  defaultHttpCachePolicies,
  getHttpCachePolicyForPath,
  invalidateHttpCacheTags,
  readHttpCacheTagVersion,
  shouldBypassHttpCache,
} from './http-cache';

describe('http-cache helpers', () => {
  it('canonicalizes query strings deterministically', () => {
    expect(canonicalizeQueryString('b=2&a=1&b=1')).toBe('a=1&b=1&b=2');
  });

  it('maps public content paths to cache policies', () => {
    expect(getHttpCachePolicyForPath('/api/articles')?.tag).toBe('articles');
    expect(getHttpCachePolicyForPath('/api/horoscopes?x=1')).toBeNull();
    expect(getHttpCachePolicyForPath('/api/horoscopes')?.tag).toBe(
      'horoscopes',
    );
    expect(getHttpCachePolicyForPath('/api/zodiac-signs/baran')?.tag).toBe(
      'zodiac-signs',
    );
    expect(getHttpCachePolicyForPath('/api/account/me')).toBeNull();
  });

  it('builds cache-control from ttl and stale policy', () => {
    expect(buildHttpCacheControl(defaultHttpCachePolicies.articles)).toBe(
      'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
    );
  });

  it('builds private cache headers for personalized content', () => {
    expect(buildPrivateHttpCacheControl()).toBe('private, no-store, max-age=0');
    expect(buildHttpCacheVary(true)).toBe(
      'Accept, Accept-Encoding, Authorization, Cookie',
    );
  });

  it('builds stable cache keys independent of query order', () => {
    const left = buildHttpCacheKey({
      keyPrefix: 'star-sign:http-cache:',
      method: 'GET',
      path: '/api/articles',
      querystring: 'b=2&a=1',
      tag: 'articles',
      tagVersion: '3',
    });
    const right = buildHttpCacheKey({
      keyPrefix: 'star-sign:http-cache:',
      method: 'get',
      path: '/api/articles',
      querystring: 'a=1&b=2',
      tag: 'articles',
      tagVersion: '3',
    });

    expect(left).toBe(right);
    expect(left).toMatch(/^star-sign:http-cache:response:articles:/);
  });

  it('defaults missing tag versions to one', async () => {
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn(),
      incr: vi.fn(),
    };

    await expect(
      readHttpCacheTagVersion(redis, 'prefix:', 'articles'),
    ).resolves.toBe('1');
  });

  it('increments tag version keys during invalidation', async () => {
    const redis = {
      get: vi.fn(),
      set: vi.fn(),
      incr: vi.fn().mockResolvedValue(2),
    };

    await invalidateHttpCacheTags(['articles', 'zodiac-signs'], {
      redis,
      keyPrefix: 'prefix:',
    });

    expect(redis.incr).toHaveBeenCalledWith(
      buildTagVersionKey('prefix:', 'articles'),
    );
    expect(redis.incr).toHaveBeenCalledWith(
      buildTagVersionKey('prefix:', 'zodiac-signs'),
    );
  });

  it('fails open when invalidation Redis call fails', async () => {
    const redis = {
      get: vi.fn(),
      set: vi.fn(),
      incr: vi.fn().mockRejectedValue(new Error('redis down')),
    };

    await expect(
      invalidateHttpCacheTags(['articles'], { redis, keyPrefix: 'prefix:' }),
    ).resolves.toBeUndefined();
  });

  it('bypasses non-public cache contexts', () => {
    expect(shouldBypassHttpCache({ method: 'POST' })).toBe(true);
    expect(
      shouldBypassHttpCache({ method: 'GET', authorization: 'Bearer token' }),
    ).toBe(true);
    expect(shouldBypassHttpCache({ method: 'GET', cookie: 'sid=1' })).toBe(
      true,
    );
    expect(shouldBypassHttpCache({ method: 'GET' })).toBe(false);
  });
});
