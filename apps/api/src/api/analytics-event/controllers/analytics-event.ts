type AnalyticsEventType =
  | 'daily_horoscope_view'
  | 'premium_content_impression'
  | 'premium_content_view'
  | 'premium_cta_click'
  | 'premium_pricing_view'
  | 'begin_checkout'
  | 'checkout_redirect'
  | 'purchase'
  | 'premium_subscription_conversion'
  | 'view_item'
  | 'select_item';

type AnalyticsPayload = Record<string, unknown>;

type AnalyticsContext = {
  request: {
    body?: unknown;
    header?: Record<string, string | string[] | undefined>;
  };
  state?: {
    user?: {
      id?: number | string;
    } | null;
  };
  get?: (name: string) => string;
  badRequest: (message: string) => unknown;
  status?: number;
  body?: unknown;
};

type JwtService = {
  verify?: (token: string) => Promise<{ id?: unknown }>;
};

const ANALYTICS_EVENT_TYPES = new Set<AnalyticsEventType>([
  'daily_horoscope_view',
  'premium_content_impression',
  'premium_content_view',
  'premium_cta_click',
  'premium_pricing_view',
  'begin_checkout',
  'checkout_redirect',
  'purchase',
  'premium_subscription_conversion',
  'view_item',
  'select_item',
]);

const FIRST_PARTY_UID = 'api::analytics-event.analytics-event';

const toPayload = (body: unknown): AnalyticsPayload => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {};
  }

  const record = body as AnalyticsPayload;
  return record['data'] &&
    typeof record['data'] === 'object' &&
    !Array.isArray(record['data'])
    ? (record['data'] as AnalyticsPayload)
    : record;
};

const toString = (
  value: unknown,
  options: { maxLength?: number; fallback?: string } = {},
): string => {
  if (typeof value !== 'string') {
    return options.fallback ?? '';
  }

  const trimmed = value.trim();
  return trimmed.slice(0, options.maxLength ?? 500);
};

const toNullableString = (
  value: unknown,
  options: { maxLength?: number } = {},
): string | null => {
  const trimmed = toString(value, options);
  return trimmed.length > 0 ? trimmed : null;
};

const toNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toUserId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const toEventType = (value: unknown): AnalyticsEventType | null => {
  if (typeof value !== 'string') {
    return null;
  }

  return ANALYTICS_EVENT_TYPES.has(value as AnalyticsEventType)
    ? (value as AnalyticsEventType)
    : null;
};

const toOccurredAt = (value: unknown): Date => {
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
};

const toEventDay = (date: Date): string => date.toISOString().slice(0, 10);

const getAuthorizationHeader = (ctx: AnalyticsContext): string => {
  const header = ctx.request.header?.authorization;
  if (typeof header === 'string') {
    return header;
  }

  if (Array.isArray(header)) {
    return header[0] ?? '';
  }

  return typeof ctx.get === 'function' ? ctx.get('authorization') : '';
};

const getUsersPermissionsJwtService = (): JwtService | null => {
  try {
    return strapi.plugin('users-permissions').service('jwt') as JwtService;
  } catch {
    return null;
  }
};

const resolveUserId = async (ctx: AnalyticsContext): Promise<number | null> => {
  const stateUserId = toUserId(ctx.state?.user?.id);
  if (stateUserId) {
    return stateUserId;
  }

  const authHeader = getAuthorizationHeader(ctx);
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return null;
  }

  const jwtService = getUsersPermissionsJwtService();
  if (!jwtService?.verify) {
    return null;
  }

  try {
    const payload = await jwtService.verify(token);
    return toUserId(payload.id);
  } catch {
    return null;
  }
};

const deviceCategory = (userAgent: string): string => {
  const normalized = userAgent.toLowerCase();
  if (/ipad|tablet/.test(normalized)) {
    return 'tablet';
  }

  if (/mobile|iphone|android/.test(normalized)) {
    return 'mobile';
  }

  return 'desktop';
};

const browserFamily = (userAgent: string): string => {
  if (/Edg\//.test(userAgent)) {
    return 'Edge';
  }

  if (/Firefox\//.test(userAgent)) {
    return 'Firefox';
  }

  if (/Chrome\//.test(userAgent) || /CriOS\//.test(userAgent)) {
    return 'Chrome';
  }

  if (/Safari\//.test(userAgent)) {
    return 'Safari';
  }

  return 'Other';
};

const compactMetadata = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(source).filter(([, item]) => {
      if (item === null || item === undefined) {
        return false;
      }

      if (typeof item === 'string') {
        return item.trim().length > 0;
      }

      if (typeof item === 'number' || typeof item === 'boolean') {
        return true;
      }

      try {
        return JSON.stringify(item).length <= 5000;
      } catch {
        return false;
      }
    }),
  );
};

const resolveUniqueKey = (
  payload: AnalyticsPayload,
  visitorId: string,
  eventDay: string,
): string => {
  const contentKey =
    toNullableString(payload['content_id'], { maxLength: 120 }) ||
    toNullableString(payload['content_slug'], { maxLength: 180 }) ||
    toNullableString(payload['route'], { maxLength: 300 }) ||
    'unknown';
  const contentType =
    toNullableString(payload['content_type'], { maxLength: 80 }) || 'content';

  return [visitorId, contentType, contentKey, eventDay].join(':');
};

const hasExistingUniquePremiumView = async (
  uniqueKey: string,
): Promise<boolean> => {
  const existing = await strapi.db.query(FIRST_PARTY_UID).findOne({
    where: {
      event_type: 'premium_content_view',
      unique_key: uniqueKey,
      is_unique_daily: true,
    },
  });

  return Boolean(existing);
};

export default {
  async track(ctx: AnalyticsContext) {
    const payload = toPayload(ctx.request.body);
    const eventType = toEventType(payload['event_type']);
    const visitorId = toString(payload['visitor_id'], { maxLength: 128 });
    const sessionId = toString(payload['session_id'], { maxLength: 128 });

    if (!eventType) {
      return ctx.badRequest('Nieobsługiwany typ zdarzenia analitycznego.');
    }

    if (!visitorId || !sessionId) {
      return ctx.badRequest('visitor_id i session_id są wymagane.');
    }

    const occurredAt = toOccurredAt(payload['occurred_at']);
    const eventDay = toEventDay(occurredAt);
    const userAgent = toString(ctx.get?.('user-agent'), { maxLength: 300 });
    const userId = await resolveUserId(ctx);
    const uniqueKey =
      eventType === 'premium_content_view'
        ? resolveUniqueKey(payload, visitorId, eventDay)
        : null;
    const isUniqueDaily = uniqueKey
      ? !(await hasExistingUniquePremiumView(uniqueKey))
      : true;

    const data: Record<string, unknown> = {
      event_type: eventType,
      occurred_at: occurredAt.toISOString(),
      event_day: eventDay,
      visitor_id: visitorId,
      session_id: sessionId,
      content_type: toNullableString(payload['content_type'], {
        maxLength: 80,
      }),
      content_id: toNullableString(payload['content_id'], { maxLength: 120 }),
      content_slug: toNullableString(payload['content_slug'], {
        maxLength: 180,
      }),
      sign_slug: toNullableString(payload['sign_slug'], { maxLength: 80 }),
      horoscope_period: toNullableString(payload['horoscope_period'], {
        maxLength: 80,
      }),
      premium_mode:
        payload['premium_mode'] === 'paid' || payload['premium_mode'] === 'open'
          ? payload['premium_mode']
          : null,
      access_state: toNullableString(payload['access_state'], {
        maxLength: 80,
      }),
      route: toNullableString(payload['route'], { maxLength: 300 }),
      referrer: toNullableString(payload['referrer'], { maxLength: 500 }),
      utm_source: toNullableString(payload['utm_source'], { maxLength: 120 }),
      utm_medium: toNullableString(payload['utm_medium'], { maxLength: 120 }),
      utm_campaign: toNullableString(payload['utm_campaign'], {
        maxLength: 180,
      }),
      device_category: deviceCategory(userAgent),
      browser_family: browserFamily(userAgent),
      plan: toNullableString(payload['plan'], { maxLength: 80 }),
      currency: toNullableString(payload['currency'], { maxLength: 12 }),
      value: toNumber(payload['value']),
      unique_key: uniqueKey,
      is_unique_daily: isUniqueDaily,
      metadata: compactMetadata(payload['metadata']),
    };

    if (userId) {
      data['user'] = userId;
    }

    await strapi.db.query(FIRST_PARTY_UID).create({ data });

    ctx.status = 202;
    ctx.body = {
      accepted: true,
      uniqueDaily: isUniqueDaily,
    };
  },
};
