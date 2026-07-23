const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false, // E2E tests for todo app with shared localstorage / sequential is safer
  workers: 1, // Run sequentially to avoid cross-test storage contamination
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8123',
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx http-server -p 8123',
    url: 'http://localhost:8123',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
