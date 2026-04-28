import { test, expect } from '@playwright/test';

test('renders home page branding', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Odkryj tajemnice gwiazd' })).toBeVisible();
});
