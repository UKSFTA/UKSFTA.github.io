const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });

  try {
    console.log('Navigating to http://localhost:1314...');
    await page.goto('http://localhost:1314', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });
    await page.screenshot({ path: 'current_state.png', fullPage: true });
    console.log('Screenshot saved to current_state.png');
  } catch (error) {
    console.error('Error taking screenshot:', error);
  } finally {
    await browser.close();
  }
})();
