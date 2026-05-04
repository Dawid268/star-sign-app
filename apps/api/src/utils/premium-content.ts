import {
  evaluatePremiumContentQuality,
  type PremiumContentKind,
} from './premium-quality';

type SubscriptionStatus =
  | 'inactive'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid';

type PremiumRequestContext = {
  state?: {
    user?: {
      id?: number | string;
    } | null;
  };
  request?: {
    header?: Record<string, string | string[] | undefined>;
  };
  get?: (name: string) => string;
};

type JwtService = {
  verify?: (token: string) => Promise<{ id?: unknown }>;
};

type PremiumRecord = Record<string, unknown>;

const PREMIUM_ACCESS_STATUSES = new Set<SubscriptionStatus>([
  'trialing',
  'active',
  'past_due',
]);

const toSubscriptionStatus = (value: unknown): SubscriptionStatus => {
  if (
    value === 'trialing' ||
    value === 'active' ||
    value === 'past_due' ||
    value === 'canceled' ||
    value === 'unpaid'
  ) {
    return value;
  }

  return 'inactive';
};

const isRecord = (value: unknown): value is PremiumRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOwn = (value: PremiumRecord, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const toUserId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const getAuthorizationHeader = (ctx: PremiumRequestContext): string => {
  const header = ctx.request?.header?.authorization;
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

const resolveUserId = async (
  ctx: PremiumRequestContext,
): Promise<number | null> => {
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

export const canReadPremiumContent = async (
  ctx: PremiumRequestContext,
): Promise<boolean> => {
  const userId = await resolveUserId(ctx);
  if (!userId) {
    return false;
  }

  const profile = (await strapi.db
    .query('api::user-profile.user-profile')
    .findOne({
      where: { user: userId },
    })) as { subscription_status?: unknown } | null;

  return PREMIUM_ACCESS_STATUSES.has(
    toSubscriptionStatus(profile?.subscription_status),
  );
};

const inferPremiumContentKind = (
  value: PremiumRecord,
  attributes?: PremiumRecord | null,
): PremiumContentKind => {
  const period = value.period ?? attributes?.period;
  if (period === 'Dzienny' || period === 'dzienny') {
    return 'horoscope-daily';
  }

  if (
    period === 'Tygodniowy' ||
    period === 'Miesięczny' ||
    period === 'Miesieczny' ||
    period === 'Roczny'
  ) {
    return 'horoscope-periodic';
  }

  return 'article';
};

export const hasPremiumContent = (
  value: unknown,
  options: { content?: unknown; kind?: PremiumContentKind } = {},
): boolean =>
  evaluatePremiumContentQuality({
    premiumContent: value,
    content: options.content,
    kind: options.kind,
  }).valid;

const sanitizePremiumValue = <T>(value: T, canReadPremium: boolean): T => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePremiumValue(item, canReadPremium)) as T;
  }

  if (!isRecord(value)) {
    return value;
  }

  const next: PremiumRecord = { ...value };
  const nestedAttributesBefore = isRecord(next.attributes)
    ? next.attributes
    : null;
  const ownsPremiumField = hasOwn(next, 'premiumContent');
  const nestedOwnsPremiumField =
    nestedAttributesBefore !== null &&
    hasOwn(nestedAttributesBefore, 'premiumContent');

  for (const [key, childValue] of Object.entries(next)) {
    if (key !== 'premiumContent') {
      next[key] = sanitizePremiumValue(childValue, canReadPremium);
    }
  }

  const nestedAttributes = isRecord(next.attributes) ? next.attributes : null;
  const premiumContent = ownsPremiumField
    ? next.premiumContent
    : nestedAttributesBefore?.premiumContent;
  const freeContent = next.content ?? nestedAttributesBefore?.content;
  const hasQualityPremium = evaluatePremiumContentQuality({
    premiumContent,
    content: freeContent,
    kind: inferPremiumContentKind(next, nestedAttributesBefore),
  }).valid;

  if (
    ownsPremiumField ||
    nestedOwnsPremiumField ||
    hasOwn(next, 'hasPremiumContent')
  ) {
    next.hasPremiumContent = hasQualityPremium;
    if (nestedAttributes && hasOwn(nestedAttributes, 'hasPremiumContent')) {
      nestedAttributes.hasPremiumContent = hasQualityPremium;
    }
  }

  if (!canReadPremium || !hasQualityPremium) {
    delete next.premiumContent;
  }

  return next as T;
};

export const sanitizePremiumEntity = <T>(
  entity: T,
  canReadPremium: boolean,
): T => {
  return sanitizePremiumValue(entity, canReadPremium);
};

export const sanitizePremiumResponse = <T>(
  response: T,
  canReadPremium: boolean,
): T => {
  if (!isRecord(response) || !('data' in response)) {
    return response;
  }

  const data = response.data;
  const sanitizedData = Array.isArray(data)
    ? data.map((item) => sanitizePremiumEntity(item, canReadPremium))
    : sanitizePremiumEntity(data, canReadPremium);

  return {
    ...response,
    data: sanitizedData,
  };
};
