import { describe, expect, it, vi } from 'vitest';

import rateLimit from './rate-limit';

type TestContext = {
  path: string;
  ip: string;
  status: number;
  body: unknown;
  headers: Record<string, string>;
  set: (name: string, value: string) => void;
};

const createContext = (path: string): TestContext => {
  const ctx: TestContext = {
    path,
    ip: '203.0.113.10',
    status: 200,
    body: null,
    headers: {},
    set: (name: string, value: string) => {
      ctx.headers[name] = value;
    },
  };

  return ctx;
};

describe('rate-limit middleware', () => {
  it('limits analytics events by default', async () => {
    const middleware = rateLimit({
      windowMs: 60_000,
      max: 1,
      redisKeyPrefix: 'test:analytics-default:',
    });
    const next = vi.fn(async () => undefined);

    const first = createContext('/api/analytics/events');
    await middleware(first, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(first.headers['X-RateLimit-Limit']).toBe('1');
    expect(first.headers['X-RateLimit-Remaining']).toBe('0');

    const second = createContext('/api/analytics/events');
    await middleware(second, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(second.status).toBe(429);
    expect(second.headers['Retry-After']).toBeDefined();
    expect(second.body).toMatchObject({
      error: {
        status: 429,
        name: 'RateLimitError',
      },
    });
  });

  it('does not limit unrelated paths by default', async () => {
    const middleware = rateLimit({
      windowMs: 60_000,
      max: 1,
      redisKeyPrefix: 'test:unrelated-default:',
    });
    const next = vi.fn(async () => undefined);

    await middleware(createContext('/api/horoscopes'), next);
    await middleware(createContext('/api/horoscopes'), next);

    expect(next).toHaveBeenCalledTimes(2);
  });
});
