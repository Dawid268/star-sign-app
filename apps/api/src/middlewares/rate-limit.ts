type RateLimitConfig = {
  enabled?: boolean;
  windowMs?: number;
  max?: number;
  paths?: string[];
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const normalizePaths = (paths?: string[]): string[] =>
  Array.isArray(paths) && paths.length > 0
    ? paths
    : ['/api/auth/local', '/api/auth/local/register', '/api/newsletter', '/api/checkout/session', '/api/account/subscription'];

const getClientKey = (ctx): string => {
  const forwardedFor = typeof ctx.get === 'function' ? ctx.get('x-forwarded-for') : '';
  const firstForwardedIp = forwardedFor.split(',')[0]?.trim();
  return firstForwardedIp || ctx.ip || ctx.request?.ip || 'unknown';
};

const shouldLimitPath = (path: string, paths: string[]): boolean =>
  paths.some((candidate) => path === candidate || path.startsWith(`${candidate}/`));

export default (config: RateLimitConfig = {}) => {
  const enabled = config.enabled !== false;
  const windowMs = config.windowMs ?? 15 * 60 * 1000;
  const max = config.max ?? 60;
  const paths = normalizePaths(config.paths);

  return async (ctx, next): Promise<void> => {
    if (!enabled || !shouldLimitPath(ctx.path || '', paths)) {
      await next();
      return;
    }

    const now = Date.now();
    const key = `${getClientKey(ctx)}:${ctx.path}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    current.count += 1;

    if (current.count > max) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      ctx.set('Retry-After', String(retryAfter));
      ctx.status = 429;
      ctx.body = {
        data: null,
        error: {
          status: 429,
          name: 'RateLimitError',
          message: 'Za dużo żądań. Spróbuj ponownie za chwilę.',
          details: { retryAfter },
        },
      };
      return;
    }

    await next();
  };
};
