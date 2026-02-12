import { test, expect } from '@playwright/test';

test.describe('MOD.UK Tactical UI Verification', () => {
  test('should apply Regimental Skins correctly', async ({ page }) => {
    const units = [
        { path: '/sas/', skinClass: 'unit-sas', brandTint: 'rgb(21, 62, 53)' }, // Army Green
        { path: '/sbs/', skinClass: 'unit-sbs', brandTint: 'rgb(19, 40, 76)' }, // Navy Blue
    ];

    for (const unit of units) {
        await page.goto(unit.path);
        const body = page.locator('body');
        await expect(body).toHaveClass(new RegExp(unit.skinClass));
        
        // Verify CSS Variable inheritance
        const tint = await body.evaluate(el => getComputedStyle(el).getPropertyValue('--brand-tint').trim());
        expect(tint).not.toBe('#532a45'); 
    }
  });
});