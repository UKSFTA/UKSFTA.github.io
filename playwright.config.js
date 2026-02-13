import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
  },
  timeout: 60000,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    { command: 'python3 -m http.server 8000 --directory public', port: 8000, reuseExistingServer: true }
  ],
});
