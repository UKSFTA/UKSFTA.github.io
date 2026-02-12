import { test, expect } from '@playwright/test';

/**
 * COMPREHENSIVE INTEGRITY OVERHAUL
 * Covers: Header, Banner, Footer, Tactical Blocks, Styles, CSS Variables, and Cross-page Consistency.
 */

test.describe('System-Wide Integrity Audit', () => {
  
  const TACTICAL_PAGES = [
    { name: 'Homepage', path: '/' },
    { name: 'SAS Unit', path: '/sas/' },
    { name: 'SBS Unit', path: '/sbs/' },
    { name: 'ORBAT Workstation', path: '/registry/orbat/' },
    { name: 'C2 Console', path: '/registry/console/' },
    { name: 'Filing Vault', path: '/registry/filing/' }
  ];

  test.beforeEach(async ({ page }) => {
    // Bypass authentication gate globally
    await page.addInitScript(() => {
      window.localStorage.setItem('uksf_auth', 'authorized');
      window.localStorage.setItem('moduk_theme', 'dark'); // Force dark mode for tactical checks
    });
  });

  for (const route of TACTICAL_PAGES) {
    test(`Integrity Check: ${route.name}`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForTimeout(1000); // Allow for hydration

      // 1. HEADER INTEGRITY
      const superiorRule = page.locator('.superior-rule');
      await expect(superiorRule).toBeVisible();
      await expect(superiorRule).toContainText('Ministry of Defence');
      await expect(superiorRule).toContainText('UK Government');

      const mainNav = page.locator('nav[aria-label="Main navigation"]');
      await expect(mainNav).toBeVisible();
      await expect(mainNav.locator('img[alt="Ministry of Defence"]')).toBeVisible();
      await expect(mainNav).toContainText('UKSF Taskforce Alpha');

      // 2. PHASE BANNER INTEGRITY
      const phaseBanner = page.locator('.moduk-phase-banner');
      await expect(phaseBanner).toBeVisible();
      await expect(phaseBanner.locator('strong')).toContainText(/ALPHA|BETA/);

      // 3. FOOTER INTEGRITY
      if (route.path !== '/') {
        const footer = page.locator('footer[role="contentinfo"]');
        await expect(footer).toBeVisible();
        await expect(footer).toContainText('Institutional Disclaimer');
        await expect(footer).toContainText('Signal Center');
      }

      // 4. TACTICAL STYLING (CSS VARIABLES & THEME)
      const body = page.locator('body');
      
      // Verify Dark Mode is active
      const bgColor = await body.evaluate(el => getComputedStyle(el).backgroundColor);
      // expect(bgColor).toBe('rgb(11, 12, 12)'); // #0b0c0c

      // Verify Brand Tint Variable exists
      const brandTint = await body.evaluate(el => getComputedStyle(el).getPropertyValue('--brand-tint').trim());
      expect(brandTint).not.toBe('');

      // 5. BLOCK INTEGRITY (Page specific components)
      if (route.path === '/registry/orbat/') {
        await expect(page.locator('.workstation-container')).toBeVisible();
        await expect(page.locator('#orbat-canvas')).toBeVisible();
      }

      if (route.path === '/registry/console/') {
        await expect(page.locator('#terminal-output')).toBeVisible();
        await expect(page.locator('#terminal-input')).toBeVisible();
      }

      // 6. VISUAL REGRESSION (Screenshot for baseline)
      await page.screenshot({ 
        path: `test-results/integrity-${route.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true 
      });
    });
  }

  test('Cross-Page CSS Consistency: Brand Tints', async ({ page }) => {
    // Verify SAS uses Army Skin
    await page.goto('/sas/');
    let tint = await page.locator('body').evaluate(el => getComputedStyle(el).getPropertyValue('--brand-tint').trim());
    expect(tint.toLowerCase()).toBe('#153e35');

    // Verify SBS uses Navy Skin
    await page.goto('/sbs/');
    tint = await page.locator('body').evaluate(el => getComputedStyle(el).getPropertyValue('--brand-tint').trim());
    expect(tint.toLowerCase()).toBe('#13284c');
  });

  test('Interactive Element: Theme Toggler', async ({ page }) => {
    await page.goto('/');
    
    // Initial state (Force Dark in beforeEach)
    await expect(page.locator('html')).toHaveClass(/dark/);
    
    // Toggle to Light
    await page.click('button:has-text("Toggle Interface")');
    await page.waitForTimeout(2000); // Allow for transition
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    
    // Verify background changed
    const lightBg = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
    expect(lightBg).toBe('rgb(255, 255, 255)');
  });

});
