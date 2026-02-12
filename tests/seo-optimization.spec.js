import { test, expect } from '@playwright/test';

test.describe('SEO & Metadata Integrity', () => {
  
  const PAGES = [
    { path: '/', expectedTitle: 'UKSF Taskforce Alpha | Joint Force Command' },
    { path: '/sas/', expectedTitle: '22nd Special Air Service' },
    { path: '/sbs/', expectedTitle: 'Special Boat Service' },
    { path: '/registry/orbat/', expectedTitle: 'Order of Battle' }
  ];

  for (const pageInfo of PAGES) {
    test(`Metadata Check: ${pageInfo.path}`, async ({ page }) => {
      await page.goto(pageInfo.path);
      
      // 1. Title Check (contains expected substring)
      const title = await page.title();
      expect(title).toContain(pageInfo.expectedTitle);

      // 2. Meta Description Check
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description?.length).toBeGreaterThan(10);

      // 3. OpenGraph Tags
      await expect(page.locator('meta[property="og:title"]')).toBeAttached();
      await expect(page.locator('meta[property="og:url"]')).toBeAttached();
      
      // 4. Canonical Link
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).not.toBeNull();
    });
  }
});
