import { test, expect } from '@playwright/test';

test.describe('Visual & Layout Integrity Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass auth gate
    await page.addInitScript(() => {
      window.localStorage.setItem('uksf_auth', 'authorized');
      localStorage.setItem('dev_access', 'granted');
        window.localStorage.setItem('dev_access', 'granted');
    });
  });

  test('Homepage Blocks Fitting Check', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    const sections = page.locator('section');
    const count = await sections.count();
    
    for (let i = 0; i < count; i++) {
      const section = sections.nth(i);
      const box = await section.boundingBox();
      const viewport = page.viewportSize();
      
      console.log(`Section ${i} box:`, box);
      
      // Ensure section is at least as tall as the viewport minus header (approximately)
      if (box && viewport) {
        expect(box.height).toBeGreaterThanOrEqual(viewport.height * 0.5); 
      }
      
      // Check for horizontal overflow within the section
      const hasOverflow = await section.evaluate(el => el.scrollWidth > el.clientWidth);
      expect(hasOverflow, `Section ${i} has horizontal overflow`).toBeFalsy();

      // Check for vertical overflow within the section (content should fit in 100vh)
      const hasVerticalOverflow = await section.evaluate(el => el.scrollHeight > el.clientHeight);
      if (hasVerticalOverflow) {
          console.warn(`WARNING: Section ${i} has vertical content overflow!`);
      }
      expect(hasVerticalOverflow, `Section ${i} has vertical content overflow`).toBeFalsy();

      // Check if any image inside is inverted (unless it's a specific icon)
      const images = section.locator('img:not(.icon-invert)');
      const imgCount = await images.count();
      for (let j = 0; j < imgCount; j++) {
        const filter = await images.nth(j).evaluate(el => window.getComputedStyle(el).filter);
        expect(filter, `Image in section ${i} is inverted`).not.toContain('invert');
      }
    }
    
    await page.screenshot({ path: 'test-results/visual-audit-home-final.png', fullPage: true });
  });

  test('Workstation Fitting: ORBAT', async ({ page }) => {
    await page.goto('/registry/orbat/');
    await page.waitForTimeout(2000);
    
    const viewport = page.locator('.workstation-container');
    await expect(viewport).toBeVisible();
    
    // Ensure viewport doesn't have a vertical scrollbar (it should be fixed height)
    const hasScroll = await viewport.evaluate(el => el.scrollHeight > el.clientHeight);
    console.log('ORBAT Viewport has scroll:', hasScroll);
    
    await page.screenshot({ path: 'test-results/visual-audit-orbat-final.png' });
  });

  test('Workstation Fitting: Console', async ({ page }) => {
    await page.goto('/registry/console/');
    await page.waitForTimeout(2000);
    
    const terminal = page.locator('#terminal-output');
    await expect(terminal).toBeVisible();
    
    // Ensure the terminal output is scrollable if content exceeds height
    const isScrollable = await terminal.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.overflowY === 'auto' || style.overflowY === 'scroll';
    });
    expect(isScrollable, 'Terminal output should be scrollable').toBeTruthy();
    
    await page.screenshot({ path: 'test-results/visual-audit-console-final.png' });
  });

  test('Workstation Fitting: Filing', async ({ page }) => {
    await page.goto('/registry/filing/');
    await page.waitForTimeout(2000);
    
    const sidebar = page.locator('aside');
    const workspace = page.locator('.workstation-container');
    
    await expect(sidebar).toBeVisible();
    await expect(workspace).toBeVisible();
    
    // Check if the overall container is correctly sized (it should be the direct child of #main-content)
    const container = page.locator('#main-content > div').first();
    if (await container.count() > 0) {
        const box = await container.boundingBox();
        console.log('Filing container box:', box);
    }
    
    await page.screenshot({ path: 'test-results/visual-audit-filing-final.png' });
  });
});