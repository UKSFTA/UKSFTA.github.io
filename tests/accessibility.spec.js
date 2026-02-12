import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe.skip('MOD.UK Accessibility Audit', () => {
  test('homepage should meet WCAG 2.2 AA standards', async ({ page }) => {
    await page.goto('/');
    
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
    // Bypass auth for test
    await page.addInitScript(() => {
        window.localStorage.setItem('uksf_auth', 'authorized');
    });
    
    await page.goto('/registry/gate/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
      .exclude('#battlemetrics-graph')
      .exclude('#cookie-consent-banner')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
