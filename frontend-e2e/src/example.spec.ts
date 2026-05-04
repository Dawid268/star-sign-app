import { test, expect } from '@playwright/test';
import { mockApi } from './support/mock-api';

test('renders home page branding', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Odkryj tajemnice gwiazd' }),
  ).toBeVisible();
});
