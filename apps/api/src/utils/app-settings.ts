export type PremiumMode = 'open' | 'paid';

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
};

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
