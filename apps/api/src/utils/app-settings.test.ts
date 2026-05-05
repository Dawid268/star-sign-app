import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getAppSettings,
  isPaidPremiumEnabled,
  premiumAccessPolicy,
} from './app-settings';

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
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('app settings helpers', () => {
  it('defaults to open premium mode from env fallback', async () => {
    vi.stubEnv('PREMIUM_MODE', 'open');
    stubAppSettingsRecord(null);

    const settings = await getAppSettings();

    expect(settings.premiumMode).toBe('open');
    expect(isPaidPremiumEnabled(settings)).toBe(false);
    expect(premiumAccessPolicy(settings)).toBe('open_access');
    expect(settings.maintenanceMode).toEqual({
      enabled: false,
      title: 'Pracujemy nad Star Sign',
      message: 'Dopracowujemy stronę i wrócimy za chwilę.',
      eta: null,
      contactUrl: null,
      allowedPaths: [
        '/regulamin',
        '/polityka-prywatnosci',
        '/cookies',
        '/disclaimer',
        '/newsletter/potwierdz',
        '/newsletter/wypisz',
      ],
    });
  });

  it('requires paid mode and checkout flag for paid premium readiness', async () => {
    stubAppSettingsRecord({
      premium_mode: 'paid',
      stripe_checkout_enabled: true,
      stripe_monthly_price_id: 'price_monthly',
      stripe_annual_price_id: 'price_annual',
      monthly_price: '29.99',
      annual_price: '249',
      currency: 'PLN',
    });

    const settings = await getAppSettings();

    expect(settings.premiumMode).toBe('paid');
    expect(settings.stripeCheckoutEnabled).toBe(true);
    expect(settings.monthlyPrice).toBe(29.99);
    expect(settings.annualPrice).toBe(249);
    expect(isPaidPremiumEnabled(settings)).toBe(true);
    expect(premiumAccessPolicy(settings)).toBe('paid_enforced');
  });

  it('does not mark Stripe checkout ready while premium mode is open', async () => {
    stubAppSettingsRecord({
      premium_mode: 'open',
      stripe_checkout_enabled: true,
    });

    const settings = await getAppSettings();

    expect(settings.premiumMode).toBe('open');
    expect(settings.stripeCheckoutEnabled).toBe(true);
    expect(isPaidPremiumEnabled(settings)).toBe(false);
  });

  it('normalizes public maintenance mode settings', async () => {
    stubAppSettingsRecord({
      maintenance_mode_enabled: true,
      maintenance_title: '  Gwiazdy układają się na nowo  ',
      maintenance_message: '  Dopracowujemy kosmiczną mapę strony.  ',
      maintenance_eta: '2026-05-05T18:00:00.000Z',
      maintenance_contact_url: 'https://star-sign.example/kontakt',
      maintenance_allowed_paths: [
        '/polityka-prywatnosci',
        '/cookies',
        'https://bad.example',
        '//bad.example',
        '/polityka-prywatnosci',
      ],
    });

    const settings = await getAppSettings();

    expect(settings.maintenanceMode).toEqual({
      enabled: true,
      title: 'Gwiazdy układają się na nowo',
      message: 'Dopracowujemy kosmiczną mapę strony.',
      eta: '2026-05-05T18:00:00.000Z',
      contactUrl: 'https://star-sign.example/kontakt',
      allowedPaths: ['/polityka-prywatnosci', '/cookies'],
    });
  });

  it('falls back for invalid maintenance copy, paths and contact url', async () => {
    stubAppSettingsRecord({
      maintenance_mode_enabled: true,
      maintenance_title: '',
      maintenance_message: '   ',
      maintenance_eta: 'not-a-date',
      maintenance_contact_url: 'javascript:alert(1)',
      maintenance_allowed_paths: ['bad-path'],
    });

    const settings = await getAppSettings();

    expect(settings.maintenanceMode).toEqual({
      enabled: true,
      title: 'Pracujemy nad Star Sign',
      message: 'Dopracowujemy stronę i wrócimy za chwilę.',
      eta: null,
      contactUrl: null,
      allowedPaths: [
        '/regulamin',
        '/polityka-prywatnosci',
        '/cookies',
        '/disclaimer',
        '/newsletter/potwierdz',
        '/newsletter/wypisz',
      ],
    });
  });
});
