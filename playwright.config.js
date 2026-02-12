import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:1314',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    { command: 'hugo server -p 1314 --disableFastRender -D', url: 'http://localhost:1314', reuseExistingServer: true },
    { command: 'npm run service:registry', port: 3002, reuseExistingServer: true },
    { command: 'npm run service:rcon', port: 3001, reuseExistingServer: true }
  ],
});
