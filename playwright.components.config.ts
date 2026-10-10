import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/components', testMatch: '*.spec.ts', workers: 1,
  fullyParallel: false, retries: 0, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3001', channel: process.platform === 'win32' ? 'msedge' : undefined, trace: 'retain-on-failure' },
  webServer: { command: 'node e2e/components/server.mjs', url: 'http://127.0.0.1:3001', reuseExistingServer: false },
});
