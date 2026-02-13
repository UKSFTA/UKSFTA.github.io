import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('MOD.UK Accessibility Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        window.localStorage.setItem('moduk_theme', 'dark');
        window.localStorage.setItem('uksf_auth', 'authorized');
      localStorage.setItem('dev_access', 'granted');
        window.localStorage.setItem('dev_access', 'granted');
        document.documentElement.classList.add('dark');
    });
  });

  test('homepage should meet WCAG 2.2 AA standards', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    
    // Wait for dynamic content (Battlemetrics, etc.) to settle
    await page.waitForTimeout(2000);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
      .exclude('#battlemetrics-graph')
      .exclude('#cookie-consent-banner')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('registry portal should meet WCAG 2.2 AA standards', async ({ page }) => {
    await page.goto('/registry/gate/');
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
      .exclude('#battlemetrics-graph')
      .exclude('#cookie-consent-banner')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
