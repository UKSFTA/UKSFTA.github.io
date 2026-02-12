import { test, expect } from '@playwright/test';

test.describe('Global Infrastructure: Header, Banner & Footer', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Superior Rule (HMG Standard) should be perfectly rendered', async ({ page }) => {
    const superiorRule = page.locator('.superior-rule');
    await expect(superiorRule).toBeVisible();
    await expect(superiorRule).toContainText('Ministry of Defence');
    await expect(superiorRule).toContainText('Official Sensitive');
    await expect(superiorRule).toContainText('UK Government');
    
    // Check toggle button
    const toggleBtn = superiorRule.locator('button:has-text("Toggle Interface")');
    await expect(toggleBtn).toBeVisible();
    await expect(toggleBtn).toHaveCSS('text-transform', 'uppercase');
  });

  test('Main Navigation Bar should contain all core unit links', async ({ page }) => {
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();
    
    // Check Logo
    const logo = nav.locator('img[alt="Ministry of Defence"]');
    await expect(logo).toBeVisible();
    const logoSrc = await logo.getAttribute('src');
    expect(logoSrc).not.toBeNull();

    // Check Navigation Links (Explicitly)
    const expectedLinks = ['SAS', 'SBS', 'ASOB', 'SFSG', 'JSFAW', 'RAMC', 'Registry'];
    for (const linkText of expectedLinks) {
      const link = nav.locator(`a:has-text("${linkText}")`);
      await expect(link, `Link "${linkText}" missing from header`).toBeVisible();
    }

    // Check CTA
    const secureAccess = nav.locator('a:has-text("Secure Access")');
    await expect(secureAccess).toBeVisible();
    await expect(secureAccess).toHaveClass(/btn-mod-primary/);
  });

  test('Phase Banner should indicate ALPHA status', async ({ page }) => {
    const banner = page.locator('.moduk-phase-banner');
    await expect(banner).toBeVisible();
    const tag = banner.locator('strong');
    await expect(tag).toContainText('ALPHA');
    await expect(banner).toContainText('feedback will help us to improve it');
  });

  test('Institutional Footer should be exhaustive', async ({ page }) => {
    // Go to a subpage where footer is guaranteed (per baseof.html logic)
    await page.goto('/sas/');
    const footer = page.locator('footer[role="contentinfo"]');
    await expect(footer).toBeVisible();

    // Verify Column 1: Institutional
    await expect(footer).toContainText('UKSFTA');
    await expect(footer).toContainText('Joint Special Forces Command');

    // Verify Column 2: Operational Elements
    await expect(footer).toContainText('Operational Elements');
    await expect(footer.locator('a:has-text("SAS")')).toBeVisible();

    // Verify Column 3: Resources
    await expect(footer).toContainText('Institutional Links');
    await expect(footer.locator('a:has-text("Selection Gateway")')).toBeVisible();
    await expect(footer.locator('a:has-text("Deployment Logs")')).toBeVisible();

    // Verify Column 4: Signal Center
    await expect(footer).toContainText('Signal Center');
    await expect(footer).toContainText('Open Uplink');

    // Verify Disclaimer
    await expect(footer).toContainText('Unofficial community project');
    await expect(footer).toContainText('No affiliation with the UK Ministry of Defence');
  });
});
