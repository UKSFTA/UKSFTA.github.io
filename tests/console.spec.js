import { test, expect } from '@playwright/test';

test.describe('C2 Console', () => {
    test('should display uplink status', async ({ page }) => {
        await page.goto('/registry/console/?disable_consent=true');
        await expect(page.locator('#connection-status')).toContainText('UPLINK_ACTIVE');
    });
});
