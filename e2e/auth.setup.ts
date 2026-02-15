import { test as setup, expect } from '@playwright/test';

/**
 * Auth setup for Playwright E2E tests.
 *
 * This test enables manual WorkOS SSO authentication via Playwright Inspector.
 * The authenticated session is saved to e2e/fixtures/auth.json for reuse in other tests.
 *
 * Usage:
 *   npx playwright test --project=auth-setup
 *
 * Steps:
 * 1. Browser opens and navigates to homepage
 * 2. Test pauses - Playwright Inspector opens
 * 3. Manually complete WorkOS SSO login in the browser
 * 4. Click "Resume" in Playwright Inspector when on /dashboard
 * 5. Test verifies URL and saves authentication cookies
 */

setup('authenticate with WorkOS SSO', async ({ page }) => {
  // Navigate to homepage (will redirect to WorkOS login if not authenticated)
  await page.goto('/');

  // Pause for manual SSO completion
  // IMPORTANT: Complete the WorkOS SSO login in the browser before clicking "Resume"
  // Make sure you're on the dashboard before clicking Resume
  await page.pause();

  // Wait for any redirects/cookies to settle
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Verify authentication succeeded by checking for authenticated state
  const currentUrl = page.url();

  // Fail if still on unauthenticated pages
  const unauthenticatedPatterns = ['/login', '/auth', '/signin', '/signup'];
  const isUnauthenticated = unauthenticatedPatterns.some(pattern =>
    currentUrl.includes(pattern)
  );

  if (isUnauthenticated) {
    throw new Error(
      `Still on authentication page: ${currentUrl}\n` +
      'Please complete WorkOS SSO login in the browser before clicking "Resume"'
    );
  }

  // Check cookies
  const cookies = await page.context().cookies();
  const wosSession = cookies.find(c => c.name === 'wos-session' && c.domain === 'localhost');

  if (!wosSession) {
    throw new Error(
      'wos-session cookie not found on localhost domain!\n' +
      'The authentication callback may not have completed. Try waiting longer before clicking Resume.'
    );
  }

  console.log(`✓ Authenticated - current URL: ${currentUrl}`);
  console.log(`✓ Found wos-session cookie for localhost`);

  // Save authenticated state (cookies, localStorage, sessionStorage)
  await page.context().storageState({ path: 'e2e/fixtures/auth.json' });

  console.log('✓ Authentication successful - saved to e2e/fixtures/auth.json');
});
