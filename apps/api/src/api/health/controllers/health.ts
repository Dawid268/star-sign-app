import Redis from 'ioredis';

const startedAt = new Date();
let redisClient: Redis | null | undefined;

const checkDatabase = async (): Promise<boolean> => {
  try {
    await strapi.db.connection.raw('select 1 as ok');
    return true;
  } catch (error) {
    strapi.log.error('Healthcheck database probe failed.', error);
    return false;
  }
};

const isEnabled = (
  value: string | undefined,
  defaultValue: boolean,
): boolean => {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const redisRequired = (): boolean =>
  isEnabled(process.env.RATE_LIMIT_ENABLED, true) ||
  isEnabled(process.env.HTTP_CACHE_ENABLED, true);

const getRedisClient = (): Redis | null => {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const redisUrl =
    process.env.REDIS_URL ||
    process.env.RATE_LIMIT_REDIS_URL ||
    process.env.HTTP_CACHE_REDIS_URL ||
    '';

  if (!redisUrl) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis(redisUrl, {
    connectTimeout: 1000,
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
  redisClient.on('error', () => undefined);

  return redisClient;
};

const checkRedis = async (): Promise<boolean> => {
  if (!redisRequired()) {
    return true;
  }

  const redis = getRedisClient();

  if (!redis) {
    return false;
  }

  try {
    return (await redis.ping()) === 'PONG';
  } catch (error) {
    strapi.log.error('Healthcheck Redis probe failed.', error);
    return false;
  }
};

export default {
  async live(ctx) {
    ctx.body = {
      status: 'ok',
      service: 'star-sign-api',
      startedAt: startedAt.toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    };
  },

  async ready(ctx) {
    const [database, redis] = await Promise.all([
      checkDatabase(),
      checkRedis(),
    ]);
    const ready = database && redis;
    ctx.status = ready ? 200 : 503;
    ctx.body = {
      status: ready ? 'ready' : 'not_ready',
      service: 'star-sign-api',
      checks: {
        database,
        redis,
      },
    };
  },
};
