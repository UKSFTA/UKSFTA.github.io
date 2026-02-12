import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Tactical Interface', () => {
  // Use iPhone 13 as standard mobile reference
  test.use({ ...devices['iPhone 13'] });

  test('Mobile Homepage should be responsive and fit screen', async ({ page }) => {
    await page.goto('/');
    
    // Check for horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    // Verify header components stack or hide
    const superiorRule = page.locator('.superior-rule');
    await expect(superiorRule).toBeVisible();
    
    // Check if "Official Sensitive" hides on small screens (per our header.html class 'hidden sm:block')
    const sensitiveTag = superiorRule.locator('span:has-text("Official Sensitive")');
    await expect(sensitiveTag).not.toBeVisible();
  });

  test('Mobile Navigation interaction', async ({ page }) => {
    await page.goto('/');
    
    // Check if main desktop links are hidden
    const sasLink = page.locator('nav a:has-text("SAS")');
    // Depending on tailwind config, 'lg:flex' means hidden below 1024px. 
    // Since we are on iPhone (390px), it should be hidden.
    await expect(sasLink).not.toBeVisible();
    
    // Check if the secure access button remains (per our header.html it is 'hidden sm:flex', so on mobile it might hide)
    const secureAccess = page.locator('a:has-text("Secure Access")');
    await expect(secureAccess).not.toBeVisible();
  });

  test('Mobile Section Stacking', async ({ page }) => {
    await page.goto('/');
    
    // Unit cards should stack vertically (1 column)
    const unitsSection = page.locator('section').nth(2);
    const cards = unitsSection.locator('.group');
    const count = await cards.count();
    
    if (count > 1) {
      const box1 = await cards.nth(0).boundingBox();
      const box2 = await cards.nth(1).boundingBox();
      
      if (box1 && box2) {
        // In stacking mode, X coordinates should be similar, Y should be different
        expect(Math.abs(box1.x - box2.x)).toBeLessThan(10);
        expect(box2.y).toBeGreaterThan(box1.y);
      }
    }
  });
});
