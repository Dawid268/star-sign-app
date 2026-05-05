import { afterEach, describe, expect, it, vi } from 'vitest';

import appSettingController from './app-setting';

const stubAppSettingsRecord = (
  record: Record<string, unknown> | null,
): void => {
  vi.stubGlobal('strapi', {
    db: {
      query: vi.fn(() => ({
        findOne: vi.fn(async () => record),
      })),
    },
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('app-setting controller', () => {
  it('returns only public Premium and Stripe operation settings', async () => {
    stubAppSettingsRecord({
      premium_mode: 'paid',
      currency: 'PLN',
      monthly_price: '39.99',
      annual_price: '299',
      stripe_monthly_price_id: 'price_monthly_hidden',
      stripe_annual_price_id: 'price_annual_hidden',
      stripe_checkout_enabled: true,
      trial_days: 14,
      allow_promotion_codes: false,
      maintenance_mode_enabled: true,
      maintenance_title: 'Przerwa techniczna',
      maintenance_message: 'Wracamy po aktualizacji.',
      maintenance_eta: '2026-05-05T18:00:00.000Z',
      maintenance_contact_url: 'mailto:pomoc@example.com',
      maintenance_allowed_paths: ['/polityka-prywatnosci'],
    });
    const ctx = {};

    await appSettingController.findPublic(ctx);

    expect(ctx).toEqual({
      body: {
        premiumMode: 'paid',
        premiumAccessPolicy: 'paid_enforced',
        currency: 'PLN',
        monthlyPrice: 39.99,
        annualPrice: 299,
        stripeCheckoutEnabled: true,
        paidPremiumEnabled: true,
        trialDays: 14,
        allowPromotionCodes: false,
        maintenanceMode: {
          enabled: true,
          title: 'Przerwa techniczna',
          message: 'Wracamy po aktualizacji.',
          eta: '2026-05-05T18:00:00.000Z',
          contactUrl: 'mailto:pomoc@example.com',
          allowedPaths: ['/polityka-prywatnosci'],
        },
      },
    });
    expect(JSON.stringify(ctx)).not.toContain('price_monthly_hidden');
    expect(JSON.stringify(ctx)).not.toContain('price_annual_hidden');
    expect(JSON.stringify(ctx)).not.toContain('STRIPE_SECRET_KEY');
    expect(JSON.stringify(ctx)).not.toContain('STRIPE_WEBHOOK_SECRET');
    expect(JSON.stringify(ctx)).not.toContain('maintenance_bypass');
  });
});
