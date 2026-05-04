import { expect, type Page } from '@playwright/test';

export const waitForAppReady = async (page: Page): Promise<void> => {
  await expect(page.locator('html')).toHaveAttribute(
    'data-star-sign-app-ready',
    'true',
  );
};
