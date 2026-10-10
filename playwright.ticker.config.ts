import { defineConfig } from '@playwright/test';

/** Isolated component reception; does not replace the user's Next server on port 3001. */
export default defineConfig({
  testDir: './e2e/components', testMatch: 'live-market-ticker.spec.ts', workers: 1,
  fullyParallel: false, retries: 0, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3002', channel: process.platform === 'win32' ? 'msedge' : undefined, trace: 'retain-on-failure' },
  webServer: { command: 'node e2e/components/server.mjs', env: { COMPONENT_TEST_PORT: '3002' }, url: 'http://127.0.0.1:3002', reuseExistingServer: false },
});
