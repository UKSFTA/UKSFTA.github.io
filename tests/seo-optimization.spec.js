import { test, expect } from '@playwright/test';

test.describe('SEO & Metadata Integrity', () => {
  
  const PAGES = [
    { path: '/', expectedTitle: 'UKSF Taskforce Alpha | Joint Force Command' },
    { path: '/sas/', expectedTitle: 'Special Air Service (SAS)' },
    { path: '/sbs/', expectedTitle: 'Special Boat Service' },
    { path: '/registry/orbat/', expectedTitle: 'Order of Battle' }
  ];

  test('Homepage Metadata', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(await page.title()).toContain('UKSF Taskforce Alpha | Joint Force Command');
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc?.length).toBeGreaterThan(10);
  });

  test('SAS Page Metadata', async ({ page }) => {
    await page.goto('/sas/');
    await page.waitForLoadState('networkidle');
    expect(await page.title()).toContain('Special Air Service (SAS)');
  });

  test('ORBAT Metadata', async ({ page }) => {
    await page.goto('/registry/orbat/');
    await page.waitForLoadState('networkidle');
    expect(await page.title()).toContain('Order of Battle');
  });
});
