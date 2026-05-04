import { getAppSettings } from '../../../utils/app-settings';

export default {
  async findPublic(ctx: { body?: unknown }) {
    const settings = await getAppSettings();

    ctx.body = {
      premiumMode: settings.premiumMode,
      currency: settings.currency,
      monthlyPrice: settings.monthlyPrice,
      annualPrice: settings.annualPrice,
      stripeCheckoutEnabled: settings.stripeCheckoutEnabled,
      trialDays: settings.trialDays,
      allowPromotionCodes: settings.allowPromotionCodes,
    };
  },
};
