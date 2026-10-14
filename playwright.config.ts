import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests. They build the site against the local mock backend (the real Apps Script code running on
 * in-memory sheets, see google-apps-script/local-test) and drive it in Chromium.
 */
const API = 'http://localhost:8792';
const SITE = 'http://localhost:4173';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1, // every test resets the shared mock backend
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: SITE,
    timezoneId: 'Europe/London',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    {
      command: 'npm run mock-api',
      url: API,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run build && npx serve@14 out -l 4173 -n',
      url: SITE,
      env: { NEXT_PUBLIC_BOOKING_API_URL: API },
      timeout: 300_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
