import { test } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';
import chromium from 'playwright';

test.describe('Lighthouse Institutional Audit', () => {
  test('Homepage performance & SEO budget', async () => {
    const browser = await chromium.chromium.launch({ 
        args: ['--remote-debugging-port=9222'] 
    });
    const page = await browser.newPage();
    await page.goto('http://localhost:1313');
    
    await playAudit({
      page: page,
      thresholds: { 
        performance: 70, 
        accessibility: 90, 
        'best-practices': 90, 
        seo: 90 
      },
      port: 9222,
    });
    
    await browser.close();
  });
});