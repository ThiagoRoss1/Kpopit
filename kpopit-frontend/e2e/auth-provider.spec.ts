import { test, expect } from './support/fixtures';
import { newUser, registerViaApi } from './support/accounts';

test('an active provider retains authentication and its token on refresh 503', async ({ page }) => {
  await page.goto('/');
  await registerViaApi(page, newUser());
  await page.route('**/__auth-harness', (route) => route.fulfill({ contentType: 'text/html',
    body: '<div id="root"></div><script type="module" src="/e2e/support/auth-harness.tsx"></script>' }));
  await page.goto('/__auth-harness');
  await expect(page.getByTestId('authenticated')).toHaveText('true');
  await page.clock.install();
  await page.clock.fastForward(6_000); // past the shared refresh grace window
  await page.route('**/api/auth/refresh', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  const failed = page.waitForResponse((r) => r.url().endsWith('/auth/refresh') && r.status() === 503);
  await page.getByRole('button', { name: 'Refresh session' }).click();
  await failed;
  await expect(page.getByTestId('authenticated')).toHaveText('true');
  const hasToken = await page.evaluate(async () => {
    const { getAccessToken } = await import('/src/services/tokenStore.ts');
    return Boolean(getAccessToken());
  });
  expect(hasToken).toBe(true);
});
