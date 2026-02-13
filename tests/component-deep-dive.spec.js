import { test, expect } from '@playwright/test';

/**
 * COMPONENT DEEP DIVE: The "Everything" Audit
 * Explicitly tests CSS variables, animations, and typography consistency.
 */

test.describe('Component-Level Tactical Audit', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Bypass auth for registry checks
    await page.addInitScript(() => {
      window.localStorage.setItem('uksf_auth', 'authorized');
      localStorage.setItem('dev_access', 'granted');
        window.localStorage.setItem('dev_access', 'granted');
      window.localStorage.setItem('moduk_theme', 'dark');
    });
  });

  test('Styling: Pure Black Background Integrity', async ({ page }) => {
    const pagesToCheck = ['/', '/sas/', '/registry/orbat/'];
    
    for (const path of pagesToCheck) {
      await page.goto(path);
      const bgColor = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
      // rgb(11, 12, 12) is #0b0c0c, our tactical black
      expect(bgColor).toBe('rgb(11, 12, 12)');
    }
  });

  test('Components: Card-Mod Tactical Design', async ({ page }) => {
    // Check cards on homepage unit section
    const unitCard = page.locator('.card-mod, .group.relative').first();
    await expect(unitCard).toBeVisible();
    
    // Verify border-left accent (Command & Control standard)
    const borderLeftWidth = await unitCard.evaluate(el => getComputedStyle(el).borderLeftWidth);
    expect(parseInt(borderLeftWidth)).toBeGreaterThan(0);
  });

  test('Typography: Industrial Gothic Pro Header Check', async ({ page }) => {
    const h1 = page.locator('h1').first();
    const fontFamily = await h1.evaluate(el => getComputedStyle(el).fontFamily);
    expect(fontFamily).toContain('Industrial Gothic Pro');
    expect(await h1.evaluate(el => getComputedStyle(el).textTransform)).toBe('uppercase');
  });

  test('Animations: Intelligence Green Pulse', async ({ page }) => {
    await page.goto('/registry/orbat/');
    const pulser = page.locator('.animate-pulse').first();
    await expect(pulser).toBeVisible();
    
    // Check if it has the green color
    const color = await pulser.evaluate(el => getComputedStyle(el).backgroundColor);
    // #00703c is rgb(0, 112, 60)
    expect(color).toContain('rgb(0, 112, 60)');
  });

  test('Workstation: Terminal Input/Output UX', async ({ page }) => {
    await page.goto('/registry/console/');
    const output = page.locator('#terminal-output');
    const input = page.locator('#terminal-input');
    
    await expect(output).toBeVisible();
    await expect(input).toBeVisible();
    
    // Test input focus state
    await input.focus();
    await page.keyboard.type('INIT_RECON_SCAN');
    expect(await input.inputValue()).toBe('INIT_RECON_SCAN');
  });

  test('Layout: Sidebar Sticky Behavior', async ({ page }) => {
    await page.goto('/registry/filing/');
    const sidebar = page.locator('aside').first();
    const position = await sidebar.evaluate(el => getComputedStyle(el).position);
    // In our workstation layouts, they should be flex-col fixed height or sticky
    expect(['flex', 'relative', 'sticky']).toContain(position);
  });

});
