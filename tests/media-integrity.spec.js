import { test, expect } from '@playwright/test';

test.describe('Media & Asset Integrity: Zero Broken Images', () => {

  test('All critical unit icons and maps should load', async ({ page }) => {
    // Collect all image requests
    const brokenImages = [];
    page.on('response', response => {
      if (response.request().resourceType() === 'image' && response.status() >= 400) {
        brokenImages.push(`${response.url()} (${response.status()})`);
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000); // Wait for potential lazy loading

    // Navigate to unit pages to check those icons too
    await page.goto('/sas/');
    await page.waitForTimeout(1000);
    await page.goto('/registry/orbat/');
    await page.waitForTimeout(1000);

    expect(brokenImages, `Found broken images: ${brokenImages.join(', ')}`).toHaveLength(0);
  });

  test('Tactical Map Asset verification', async ({ page }) => {
    await page.goto('/');
    const map = page.locator('.tactical-map-container');
    await expect(map).toBeVisible();
    
    // Check bounding box to ensure it's not a collapsed 0x0 container
    const box = await map.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

  test('MOD Logo verification', async ({ page }) => {
    await page.goto('/');
    const logo = page.locator('nav img[alt="Ministry of Defence"]');
    await expect(logo).toBeVisible();
    
    const naturalWidth = await logo.evaluate(img => img.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
  });
});
