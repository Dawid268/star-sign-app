import { expect, test } from '@playwright/test';

import { mockApi } from './support/mock-api';

const maintenanceAppSettings = {
  premiumMode: 'open',
  premiumAccessPolicy: 'open_access',
  currency: 'PLN',
  monthlyPrice: 24.99,
  annualPrice: 199,
  stripeCheckoutEnabled: false,
  paidPremiumEnabled: false,
  trialDays: 7,
  allowPromotionCodes: true,
  maintenanceMode: {
    enabled: true,
    title: 'Pracujemy nad Star Sign',
    message: 'Dopracowujemy stronę i wrócimy za chwilę.',
    eta: '2026-05-05T18:00:00.000Z',
    contactUrl: null,
    allowedPaths: ['/polityka-prywatnosci'],
  },
};

test.describe('maintenance mode', () => {
  test('should replace public pages with the cosmic work-in-progress view', async ({
    page,
  }) => {
    await mockApi(page, { appSettings: maintenanceAppSettings });

    await page.goto('/premium');

    await expect(page.locator('[data-test="maintenance-mode"]')).toBeVisible();
    await expect(page.locator('[data-test="maintenance-title"]')).toContainText(
      'Pracujemy nad Star Sign',
    );
    await expect(page.locator('[data-test="navbar-logo"]')).toBeHidden();
    await expect(page.locator('router-outlet')).toHaveCount(0);
  });

  test('should keep configured legal pages available', async ({ page }) => {
    await mockApi(page, { appSettings: maintenanceAppSettings });

    await page.goto('/polityka-prywatnosci');

    await expect(page.locator('[data-test="maintenance-mode"]')).toHaveCount(0);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should fit the maintenance view on mobile without horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockApi(page, { appSettings: maintenanceAppSettings });

    await page.goto('/');

    await expect(page.locator('[data-test="maintenance-mode"]')).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
