export type PremiumMode = 'open' | 'paid';

export type MaintenanceModeSettings = {
  enabled: boolean;
  title: string;
  message: string;
  eta: string | null;
  contactUrl: string | null;
  allowedPaths: string[];
};

export type AppSettings = {
  premiumMode: PremiumMode;
  currency: 'PLN' | 'EUR' | 'USD';
  monthlyPrice: number;
  annualPrice: number;
  stripeMonthlyPriceId: string | null;
  stripeAnnualPriceId: string | null;
  stripeCheckoutEnabled: boolean;
  trialDays: number;
  allowPromotionCodes: boolean;
  maintenanceMode: MaintenanceModeSettings;
};

type AppSettingRecord = {
  premium_mode?: unknown;
  currency?: unknown;
  monthly_price?: unknown;
  annual_price?: unknown;
  stripe_monthly_price_id?: unknown;
  stripe_annual_price_id?: unknown;
  stripe_checkout_enabled?: unknown;
  trial_days?: unknown;
  allow_promotion_codes?: unknown;
  maintenance_mode_enabled?: unknown;
  maintenance_title?: unknown;
  maintenance_message?: unknown;
  maintenance_eta?: unknown;
  maintenance_contact_url?: unknown;
  maintenance_allowed_paths?: unknown;
};

const DEFAULT_MAINTENANCE_ALLOWED_PATHS = [
  '/regulamin',
  '/polityka-prywatnosci',
  '/cookies',
  '/disclaimer',
  '/newsletter/potwierdz',
  '/newsletter/wypisz',
];

const DEFAULT_MAINTENANCE_TITLE = 'Pracujemy nad Star Sign';
const DEFAULT_MAINTENANCE_MESSAGE = 'Dopracowujemy stronę i wrócimy za chwilę.';

const toPremiumMode = (value: unknown): PremiumMode =>
  value === 'paid' ? 'paid' : 'open';

const toCurrency = (value: unknown): AppSettings['currency'] => {
  if (value === 'EUR' || value === 'USD') {
    return value;
  }

  return 'PLN';
};

const toNumber = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const toTrimmedString = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const toNullableIsoDate = (value: unknown): string | null => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const isSafeRelativePath = (value: string): boolean =>
  value.startsWith('/') && !value.startsWith('//') && value.length <= 160;

const toAllowedPaths = (value: unknown): string[] => {
  const rawPaths = Array.isArray(value) ? value : [];
  const paths = rawPaths
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(isSafeRelativePath);

  return paths.length > 0
    ? [...new Set(paths)]
    : DEFAULT_MAINTENANCE_ALLOWED_PATHS;
};

const toContactUrl = (value: unknown): string | null => {
  const url = toNullableString(value);
  if (!url) {
    return null;
  }

  if (
    url.startsWith('https://') ||
    url.startsWith('mailto:') ||
    isSafeRelativePath(url)
  ) {
    return url;
  }

  return null;
};

const envPremiumMode = (): PremiumMode =>
  toPremiumMode(process.env.PREMIUM_MODE || process.env.APP_PREMIUM_MODE);

export const defaultAppSettings = (): AppSettings => ({
  premiumMode: envPremiumMode(),
  currency: 'PLN',
  monthlyPrice: 24.99,
  annualPrice: 199,
  stripeMonthlyPriceId: null,
  stripeAnnualPriceId: null,
  stripeCheckoutEnabled: false,
  trialDays: 7,
  allowPromotionCodes: true,
  maintenanceMode: {
    enabled: false,
    title: DEFAULT_MAINTENANCE_TITLE,
    message: DEFAULT_MAINTENANCE_MESSAGE,
    eta: null,
    contactUrl: null,
    allowedPaths: DEFAULT_MAINTENANCE_ALLOWED_PATHS,
  },
});

const normalizeAppSettings = (
  record: AppSettingRecord | null | undefined,
): AppSettings => {
  const defaults = defaultAppSettings();
  if (!record) {
    return defaults;
  }

  return {
    premiumMode: toPremiumMode(record.premium_mode ?? defaults.premiumMode),
    currency: toCurrency(record.currency ?? defaults.currency),
    monthlyPrice: toNumber(record.monthly_price, defaults.monthlyPrice),
    annualPrice: toNumber(record.annual_price, defaults.annualPrice),
    stripeMonthlyPriceId: toNullableString(record.stripe_monthly_price_id),
    stripeAnnualPriceId: toNullableString(record.stripe_annual_price_id),
    stripeCheckoutEnabled: toBoolean(
      record.stripe_checkout_enabled,
      defaults.stripeCheckoutEnabled,
    ),
    trialDays: toNumber(record.trial_days, defaults.trialDays),
    allowPromotionCodes: toBoolean(
      record.allow_promotion_codes,
      defaults.allowPromotionCodes,
    ),
    maintenanceMode: {
      enabled: toBoolean(record.maintenance_mode_enabled, false),
      title: toTrimmedString(
        record.maintenance_title,
        DEFAULT_MAINTENANCE_TITLE,
      ),
      message: toTrimmedString(
        record.maintenance_message,
        DEFAULT_MAINTENANCE_MESSAGE,
      ),
      eta: toNullableIsoDate(record.maintenance_eta),
      contactUrl: toContactUrl(record.maintenance_contact_url),
      allowedPaths: toAllowedPaths(record.maintenance_allowed_paths),
    },
  };
};

export const getAppSettings = async (): Promise<AppSettings> => {
  try {
    const record = (await strapi.db
      .query('api::app-setting.app-setting')
      .findOne({ where: {} })) as AppSettingRecord | null;

    return normalizeAppSettings(record);
  } catch {
    return defaultAppSettings();
  }
};

export const getPremiumMode = async (): Promise<PremiumMode> =>
  (await getAppSettings()).premiumMode;

export const isPaidPremiumEnabled = (settings: AppSettings): boolean =>
  settings.premiumMode === 'paid' && settings.stripeCheckoutEnabled;

export const premiumAccessPolicy = (
  settings: Pick<AppSettings, 'premiumMode'>,
): 'open_access' | 'paid_enforced' =>
  settings.premiumMode === 'paid' ? 'paid_enforced' : 'open_access';
