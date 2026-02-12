import { test, expect } from '@playwright/test';

test.describe('Institutional Aesthetic & Layout Verification', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Bypass auth gate
    await page.addInitScript(() => {
      window.localStorage.setItem('uksf_auth', 'authorized');
    });

    await page.goto('/');
    // Wait for dynamic content to load
    await page.waitForTimeout(2000);
  });

  test('Homepage sections should not have horizontal overflow', async ({ page }) => {
    const sections = await page.locator('section');
    const count = await sections.count();
    const viewportSize = page.viewportSize();
    
    if (!viewportSize) throw new Error("Viewport size not found");

    for (let i = 0; i < count; i++) {
      const section = sections.nth(i);
      const box = await section.boundingBox();
      const id = await section.getAttribute('id') || `section-${i}`;
      
      if (box) {
        // Check for horizontal overflow
        expect(box.width, `Section ${id} width is overflowing`).toBeLessThanOrEqual(viewportSize.width);
        
        // Take a screenshot of each section for visual debugging
        await section.screenshot({ path: `test-results/section-${id}.png` });
      }
    }
  });

  test('Main scroll container should not have horizontal overflow', async ({ page }) => {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth, `Horizontal scroll detected: ${scrollWidth} > ${clientWidth}`).toBeLessThanOrEqual(clientWidth);
  });

  test('Battlemetrics graph should be rendered on homepage', async ({ page }) => {
    const graph = page.locator('#battlemetrics-graph');
    await expect(graph).toBeVisible();
    
    // Wait for potential deferred rendering
    await page.waitForTimeout(2000);
    
    // Check if it contains an SVG or the "No Telemetry" message
    const hasSvg = await graph.locator('svg').count() > 0;
    const hasNoDataMessage = await page.getByText('No_Telemetry_Detected').count() > 0;
    
    expect(hasSvg || hasNoDataMessage, 'Graph should either have an SVG or a "No Telemetry" message').toBeTruthy();
    
    if (hasSvg) {
      console.log("Battlemetrics SVG detected successfully.");
    } else {
      console.log("Battlemetrics reported No_Telemetry_Detected.");
    }
    
    // Test range switching
    const weekBtn = page.locator('button:has-text("7D")').first();
    if (await weekBtn.isVisible()) {
      await weekBtn.click();
      await page.waitForTimeout(1000);
      const pointsAfterSwitch = await graph.locator('rect').count();
      console.log(`Points after switching to 7D: ${pointsAfterSwitch}`);
      expect(pointsAfterSwitch).toBeGreaterThan(0);
    }

    await graph.screenshot({ path: 'test-results/battlemetrics-graph-home.png' });
  });

  test('Battlemetrics graph should be rendered on covert page', async ({ page }) => {
    // 1. Bypass auth gate
    await page.addInitScript(() => {
      window.localStorage.setItem('uksf_auth', 'authorized');
    });

    await page.goto('/registry/archive-covert/');
    const graph = page.locator('#battlemetrics-graph');
    await expect(graph).toBeVisible();
    
    // Wait for potential deferred rendering
    await page.waitForTimeout(2000);
    
    // Check if it contains an SVG or the "No Telemetry" message
    const hasSvg = await graph.locator('svg').count() > 0;
    const hasNoDataMessage = await page.getByText('No_Telemetry_Detected').count() > 0;
    
    expect(hasSvg || hasNoDataMessage, 'Graph should either have an SVG or a "No Telemetry" message').toBeTruthy();
    
    if (hasSvg) {
      console.log("Battlemetrics SVG detected on covert page.");
    } else {
      console.log("Battlemetrics reported No_Telemetry_Detected on covert page.");
    }
    
    await graph.screenshot({ path: 'test-results/battlemetrics-graph-covert.png' });
  });
});
