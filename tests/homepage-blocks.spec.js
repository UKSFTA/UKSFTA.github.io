import { test, expect } from '@playwright/test';

test.describe('Homepage Architecture: Block-by-Block Verification', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Section 1: Primary Hero Block', async ({ page }) => {
    await page.waitForTimeout(2000); // Allow for hydration
    const hero = page.locator('section').nth(0);
    await expect(hero.locator('h1')).toContainText('Always A Little Further');
    await expect(hero.locator('p')).toContainText('Taskforce Alpha coordinates elite special operations');
    
    // CTAs
    await expect(hero.locator('a:has-text("Start Selection")')).toBeVisible();
    await expect(hero.locator('a:has-text("Explore Capability")')).toBeVisible();
  });

  test('Section 2: Mission Directive Block', async ({ page }) => {
    const mission = page.locator('section').nth(1);
    await expect(mission.locator('h2')).toContainText('Strategic Integration');
    await expect(mission).toContainText('Ministry of Defence standards');
  });

  test('Section 3: Unit Directory Block', async ({ page }) => {
    const units = page.locator('section').nth(2);
    await expect(units.locator('h2')).toContainText('Taskforce Units');
    
    // Check for specific unit cards
    const unitCards = ['SAS', 'SBS', 'ASOB', 'SFSG', 'JSFAW', 'RAMC'];
    for (const unit of unitCards) {
      await expect(units.locator(`h3:has-text("${unit}")`)).toBeVisible();
    }
  });

  test('Section 4: AOR Workstation Block', async ({ page }) => {
    await page.waitForTimeout(2000); // Allow for widgets to load
    const aor = page.locator('section').nth(3);
    // Explicitly target the section h2, not nested widget h2s
    await expect(aor.locator('> .moduk-width-container h2').first()).toContainText('AOR Control');
    await expect(aor.locator('.bg-mod-green')).toContainText('STATION_ACTIVE');
    
    // Map Check
    const map = aor.locator('.tactical-map-container');
    await expect(map).toBeVisible();
    await expect(map.locator('.unit-node').first()).toBeVisible();
    
    // Comms Hub Check
    await expect(aor.locator('.live-ops-feed-container').first()).toBeVisible();
  });

  test('Section 5: Final Selection Gateway', async ({ page }) => {
    const gateway = page.locator('section').nth(4);
    await expect(gateway.locator('h2')).toContainText('Strategic Enlistment');
    await expect(gateway.locator('a:has-text("Apply for Selection")')).toBeVisible();
  });
});
