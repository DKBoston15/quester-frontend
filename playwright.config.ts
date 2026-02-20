import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing the Research Analyst chat feature.
 *
 * Key design decisions:
 * - Long timeouts (120s test, 90s expect) to accommodate AI responses (10-60s)
 * - Sequential execution (fullyParallel: false) to avoid concurrent AI queries
 * - No retries (retries: 0) since AI tests are non-deterministic
 * - No webServer - users must start dev servers manually via Tilt
 * - Two projects: auth-setup (manual SSO) and analyst-tests (uses saved auth)
 */
export default defineConfig({
  testDir: './e2e',

  // Long timeouts for AI response times (10-60s per query)
  timeout: 120_000, // 2 minutes per test
  expect: {
    timeout: 90_000, // 90s for assertions (waiting for AI responses)
  },

  // Sequential execution - avoid concurrent AI queries
  fullyParallel: false,

  // No retries - AI non-determinism makes retries misleading
  retries: 0,

  // Reporter configuration
  reporter: [
    ['html'], // HTML report with screenshots on failure
    ['list'], // Terminal output
  ],

  // Shared settings for all projects
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure', // Capture trace on test failure
    screenshot: 'only-on-failure', // Screenshots on failure only
  },

  // Projects define test execution contexts
  projects: [
    // auth-setup: Manual SSO authentication, saves cookies
    {
      name: 'auth-setup',
      testMatch: /e2e\/auth\.setup\.ts/,
      // No storageState - starts with fresh browser context
      use: {
        headless: false, // Always run with visible browser for manual SSO
        launchOptions: {
          slowMo: 500, // Slow down actions for better visibility
        },
      },
    },

    // analyst-tests: E2E tests using saved auth state
    {
      name: 'analyst-tests',
      testMatch: /e2e\/analyst\.spec\.ts/,
      // No dependency on auth-setup - assumes auth.json already exists
      // Run auth-setup manually first: npx playwright test --project=auth-setup
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/fixtures/auth.json', // Load saved auth cookies
      },
    },
  ],

  // No webServer configured - users start servers manually via Tilt
  // This allows better control over dev environment and debugging
});
