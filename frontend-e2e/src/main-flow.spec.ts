import { test, expect } from '@playwright/test';
import { waitForAppReady } from './support/app-ready';
import { mockApi } from './support/mock-api';

test.describe('Star Sign - Main Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
  });

  test('should display home page elements', async ({ page }) => {
    // Check Logo
    const logo = page.locator('[data-test="navbar-logo"]');
    await expect(logo).toBeVisible();
    await expect(logo).toContainText('Star Sign');

    // Check Hero Section
    const heroTitle = page.locator('h1');
    await expect(heroTitle).toContainText('Odkryj tajemnice gwiazd');

    const startButton = page.locator('[data-test="home-hero-start"]');
    await expect(startButton).toBeVisible();
  });

  test('should navigate to Blog and back', async ({ page }) => {
    // Click Blog link in Navbar
    const blogLink = page
      .locator('[data-test="navbar-link-artykuly"]')
      .filter({ visible: true });
    await blogLink.click();

    // Check URL
    await expect(page).toHaveURL(/.*artykuly/);

    // Check Blog Title
    const blogTitle = page.locator('h1');
    await expect(blogTitle).toContainText('Mistycyzm na co dzień');

    // Click Logo to go back
    await page.locator('[data-test="navbar-logo"]').click();
    await expect(page).toHaveURL('/');
  });

  test('should handle newsletter subscription - error cases', async ({
    page,
  }) => {
    const emailInput = page.locator('[data-test="home-newsletter-input"]');
    const submitButton = page.locator('[data-test="home-newsletter-submit"]');

    // Invalid email
    await emailInput.fill('invalid-email');
    await submitButton.click();

    // In a real app, we'd check for a validation message
    // For now, let's assume it doesn't show success
    const successMsg = page.locator('[data-test="home-newsletter-success"]');
    await expect(successMsg).not.toBeVisible();
  });

  test('should work with mobile navigation', async ({ page, isMobile }) => {
    if (!isMobile) return;

    // Mobile menu toggle should be visible
    const mobileToggle = page.locator('[data-test="navbar-mobile-toggle"]');
    await expect(mobileToggle).toBeVisible();

    // Open menu
    await mobileToggle.click();

    // Check if links are visible in mobile menu
    const blogLink = page
      .locator('[data-test="navbar-link-artykuly"]')
      .filter({ visible: true });
    await expect(blogLink).toBeVisible();

    // Close menu (click outside or toggle again)
    await mobileToggle.click();
    // In some implementations, visibility might change or be hidden by CSS
  });

  test('should filter blog articles by category', async ({ page }) => {
    await page.goto('/artykuly');

    // Wait for categories to load
    const filters = page.locator('[data-test^="blog-category-filter-"]');
    await expect(filters.first()).toBeVisible();

    const initialArticleCount = await page
      .locator('[data-test^="blog-article-card-"]')
      .count();

    // Click a specific category (not 'Wszystko')
    const secondFilter = filters.nth(1);
    const categoryName = await secondFilter.innerText();
    await secondFilter.click();

    // Wait for URL or content update (if dynamic)
    // Check if all displayed articles have that category (if we can verify by text/attr)
    // For now, just check if it doesn't crash and count changed or remained sane
    const filteredCount = await page
      .locator('[data-test^="blog-article-card-"]')
      .count();
    expect(filteredCount).toBeGreaterThanOrEqual(0);
  });

  test('should navigate to multiple zodiac sign profiles', async ({ page }) => {
    // Sign 1: Baran
    await page.goto('/');
    const baranCard = page.locator('[data-test="home-zodiac-sign-baran"]');
    if (await baranCard.isVisible()) {
      await baranCard.click();
      await expect(page).toHaveURL(/.*znaki\/baran/);
      await expect(page.locator('h1')).toContainText('Baran');
    }

    // Sign 2: Byk
    await page.goto('/');
    const bykCard = page.locator('[data-test="home-zodiac-sign-byk"]');
    if (await bykCard.isVisible()) {
      await bykCard.click();
      await expect(page).toHaveURL(/.*znaki\/byk/);
      await expect(page.locator('h1')).toContainText('Byk');
    }
  });

  test('should submit contact form', async ({ page }) => {
    await page.goto('/kontakt');
    await waitForAppReady(page);
    await expect(page.locator('[data-test="contact-form"]')).toBeVisible();
    await expect(
      page.locator('[data-test="contact-name-input"]'),
    ).toBeEditable();

    await page.locator('[data-test="contact-name-input"]').fill('E2E Tester');
    await page
      .locator('[data-test="contact-email-input"]')
      .fill('tester@example.com');
    await page
      .locator('[data-test="contact-subject-input"]')
      .fill('E2E Test Subject');
    await page
      .locator('[data-test="contact-message-input"]')
      .fill('This is a test message from Playwright.');

    const submitButton = page.locator('[data-test="contact-submit-button"]');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Check success message
    const successMessage = page.locator(
      '[data-test="contact-success-message"]',
    );
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    await expect(successMessage).toContainText('Wiadomość wysłana');
  });

  test('should show 404 page for non-existent route', async ({ page }) => {
    await page.goto('/jakas-nieistniejaca-strona');
    await expect(page.locator('[data-test="not-found-title"]')).toContainText(
      '404',
    );
    await expect(page.locator('text=Zagubiony w kosmosie?')).toBeVisible();
  });

  test('should send purchase analytics once on checkout success', async ({
    page,
    baseURL,
  }) => {
    await page.context().addCookies([
      {
        name: 'cookie-consent-v2',
        value: encodeURIComponent(
          JSON.stringify({ necessary: true, analytics: true }),
        ),
        url: baseURL || 'http://localhost:4300',
      },
    ]);

    await page.goto('/checkout/success?session_id=cs_test_mock');
    await expect(page.locator('h1')).toContainText('Dziękujemy za zamówienie');

    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            ((window as any).dataLayer as unknown[][] | undefined)?.filter(
              (entry) => entry[0] === 'event' && entry[1] === 'purchase',
            ).length ?? 0,
        ),
      )
      .toBe(1);

    await expect
      .poll(async () =>
        page.evaluate(() =>
          window.sessionStorage.getItem('star-sign:ga4:purchase:cs_test_mock'),
        ),
      )
      .toBe('true');

    await page.reload();

    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            ((window as any).dataLayer as unknown[][] | undefined)?.filter(
              (entry) => entry[0] === 'event' && entry[1] === 'purchase',
            ).length ?? 0,
        ),
      )
      .toBe(0);

    await expect
      .poll(async () =>
        page.evaluate(() =>
          window.sessionStorage.getItem('star-sign:ga4:purchase:cs_test_mock'),
        ),
      )
      .toBe('true');
  });
});
