import { test, expect } from './support/fixtures';
import { newUser, registerViaApi } from './support/accounts';

test('an active provider retains authentication and its token on refresh 503', async ({ page }) => {
  await page.goto('/');
  await registerViaApi(page, newUser());
  // React Router's dev server injects its HMR preamble into the pages it renders; this bare page loads it first.
  await page.route('**/__auth-harness', (route) => route.fulfill({ contentType: 'text/html',
    body: '<div id="root"></div><script type="module" src="/@id/__x00__virtual:react-router/inject-hmr-runtime"></script>'
      + '<script type="module" src="/e2e/support/auth-harness.tsx"></script>' }));
  await page.goto('/__auth-harness');
  await expect(page.getByTestId('authenticated')).toHaveText('true');
  await page.clock.install();
  await page.clock.fastForward(6_000); // past the shared refresh grace window
  await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  const failed = page.waitForResponse((r) => r.url().endsWith('/auth/refresh') && r.status() === 503);
  await page.getByRole('button', { name: 'Refresh session' }).click();
  await failed;
  await expect(page.getByTestId('authenticated')).toHaveText('true');
  // The exact URL the app loaded: another specifier (e.g. without .ts) gives a fresh module with no token.
  const hasToken = await page.evaluate(async (moduleUrl) => {
    const { getAccessToken } = await import(moduleUrl);
    return Boolean(getAccessToken());
  }, '/src/services/tokenStore.ts');
  expect(hasToken).toBe(true);
});
