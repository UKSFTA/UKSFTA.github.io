import { expect, test } from '@playwright/test';

test.describe('Filing Terminal', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('uksf_auth', 'authorized');
      localStorage.setItem('dev_access', 'granted');
      window.localStorage.setItem('dev_access', 'granted');
      window.localStorage.setItem('uksf_hq_auth', 'true');
    });
  });

  test('should show induction briefing for new users', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem('uksfta_vault_tutorial_seen');
    });
    await page.goto('/registry/filing/?disable_consent=true');
    const onboarding = page.locator('#vault-onboarding');
    await expect(onboarding).toHaveAttribute('data-visible', 'true');
    await expect(page.locator('#onboarding-content')).toContainText(
      'Welcome to the RSIS Vault',
    );
  });
});
