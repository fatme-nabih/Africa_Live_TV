import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3001',
    storageState: process.env.E2E_STORAGE_STATE || undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined) },
    },
  ],
  webServer: process.env.E2E_EXTERNAL_SERVER === 'true'
    ? undefined
    : {
        command: process.env.CI ? 'npm start' : 'npm run dev',
        url: process.env.E2E_BASE_URL ?? 'http://localhost:3001',
        // Reusing another checkout on port 3001 can produce a false positive.
        reuseExistingServer: !process.env.CI && process.env.E2E_REUSE_SERVER === 'true',
        timeout: 120_000,
      },
});
