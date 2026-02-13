import { expect, test } from '@playwright/test';

test.describe('Maintenance Page Layout Verification', () => {
  test('Maintenance page should be strictly full screen with no scrolling', async ({
    page,
  }) => {
    // Clear dev_access to ensure we hit the maintenance page
    await page.addInitScript(() => {
      window.localStorage.removeItem('dev_access');
    });

    await page.goto('/maintenance/');

    // 1. Verify URL and content
    await expect(page).toHaveURL(/\/maintenance\//);
    await expect(page.locator('h1')).toContainText('System Deployment');

    // 2. Check for scrolling
    const scrollHeight = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    const clientHeight = await page.evaluate(
      () => document.documentElement.clientHeight,
    );
    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth,
    );

    expect(
      scrollHeight,
      `Vertical scroll detected: ${scrollHeight} > ${clientHeight}`,
    ).toBeLessThanOrEqual(clientHeight);
    expect(
      scrollWidth,
      `Horizontal scroll detected: ${scrollWidth} > ${clientWidth}`,
    ).toBeLessThanOrEqual(clientWidth);

    // 3. Verify body style
    const overflow = await page.evaluate(
      () => window.getComputedStyle(document.body).overflow,
    );
    expect(overflow).toBe('hidden');

    await page.screenshot({
      path: 'test-results/maintenance-page-fitting.png',
      fullPage: true,
    });
  });
});
