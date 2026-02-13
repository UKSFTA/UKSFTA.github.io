import { test, expect } from '@playwright/test';

test.describe('RSIS Security Gating & Authentication', () => {

  test('Unauthenticated users should be redirected to Gate from ORBAT', async ({ page }) => {
    // Clear any existing auth
    await page.addInitScript(() => {
      window.localStorage.removeItem('uksf_auth');
    });

    await page.goto('/registry/orbat/');
    await page.waitForTimeout(5000); // Wait for SVG/Data fragments
    
    // Should be redirected to /registry/gate/ per baseof.html logic
    await expect(page).toHaveURL(/\/registry\/gate\//);
    await expect(page.locator('h1')).toContainText('Authorization');
  });

  test('Unauthenticated users should be redirected to Gate from Console', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('uksf_auth');
    });

    await page.goto('/registry/console/');
    await expect(page).toHaveURL(/\/registry\/gate\//);
  });

  test('Successful authentication should unlock the workstation', async ({ page }) => {
    await page.goto('/registry/gate/');
    
    // Simulate manual auth injection (simulating the CTF result)
    await page.evaluate(() => {
      localStorage.setItem('uksf_auth', 'authorized');
      localStorage.setItem('dev_access', 'granted');
    });

    // Now navigate to ORBAT manually (or via button if we had one)
    await page.goto('/registry/orbat/');
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/registry\/orbat\//);
    await expect(page.locator('.workstation-container')).toBeVisible();
  });
});
