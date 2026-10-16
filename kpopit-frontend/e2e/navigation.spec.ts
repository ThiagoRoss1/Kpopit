import { test, expect, type Page } from './support/fixtures';
import { newUser, registerViaApi } from './support/accounts';
import { closeModal, openGame, searchInput } from './support/game';

async function expectCleanLoad(page: Page, errors: { list: string[] }) {
  await page.waitForLoadState('networkidle');
  expect(errors.list, `console errors:\n${errors.list.join('\n')}`).toEqual([]);
}

type Route = { path: string; landsOn?: string; marker: (p: Page) => ReturnType<Page['getByText']> };

const STATIC_ROUTES: Route[] = [
  { path: '/', marker: (p) => p.getByRole('button', { name: 'Changelog' }) },
  { path: '/idols', marker: (p) => p.locator('a[href^="/idols/"]').first() },
  { path: '/collections', marker: (p) => p.getByText('Kpopit Collections').first() },
  { path: '/login', marker: (p) => p.getByRole('button', { name: 'Login to KpopIt' }) },
  { path: '/register', marker: (p) => p.getByRole('button', { name: 'Join KpopIt' }) },
  { path: '/forgot-password', marker: (p) => p.getByRole('button', { name: 'Send Reset Link' }) },
  // Without a token these pages explain the link is invalid (reset redirects to forgot).
  { path: '/reset-password', landsOn: '/forgot-password', marker: (p) => p.getByRole('button', { name: 'Send Reset Link' }) },
  { path: '/verify-email', marker: (p) => p.getByText('Invalid verification link.') },
  { path: '/confirm-email-change', marker: (p) => p.getByText('Invalid confirmation link.') },
  { path: '/revert-email-change', marker: (p) => p.getByText('Invalid revert link.') },
  { path: '/privacy-policy', marker: (p) => p.getByText(/privacy policy/i).first() },
  { path: '/contact', marker: (p) => p.getByText(/contact/i).first() },
];

test.describe('every route loads @mobile', () => {
  for (const route of STATIC_ROUTES) {
    test(`${route.path} loads without console errors @smoke`, async ({ page, consoleErrors }) => {
      await page.goto(route.path);
      await expect(route.marker(page)).toBeVisible();
      const finalPath = route.landsOn ?? route.path;
      await expect(page).toHaveURL(new RegExp(`${finalPath.replace(/\//g, '\\/')}$`));
      await expectCleanLoad(page, consoleErrors);
    });
  }

  for (const mode of ['classic', 'blurry', 'pixelated'] as const) {
    test(`/${mode} loads without console errors @smoke`, async ({ page, consoleErrors }) => {
      await openGame(page, mode);
      await expectCleanLoad(page, consoleErrors);
    });
  }

  test('an idol page loads from the idols list @smoke', async ({ page, consoleErrors }) => {
    await page.goto('/idols');
    const first = page.locator('a[href^="/idols/"]').first();
    const href = await first.getAttribute('href');
    expect(href).toMatch(/^\/idols\/\d+\/[\w-]+$/);
    await page.goto(href!);
    await expect(page).toHaveURL(href!);
    await expect(page.getByRole('img', { name: / photo$/ }).first()).toBeVisible();
    await expectCleanLoad(page, consoleErrors);
  });

  test('an album page loads from the collections list @smoke', async ({ page, consoleErrors }) => {
    await page.goto('/collections');
    const link = page.locator('a[href^="/collections/"]').first();
    const href = await link.getAttribute('href');
    expect(href).toMatch(/^\/collections\/\d+\/[\w-]+$/);
    await page.goto(href!);
    await expect(page).toHaveURL(href!);
    await expectCleanLoad(page, consoleErrors);
  });

  test('the old /collection path is just an unknown route (goes home)', async ({ page }) => {
    await page.goto('/collection');
    await expect(page).toHaveURL(/\/$/);
  });

  test('/profile/:username loads for a logged-in user @smoke', async ({ page, consoleErrors }) => {
    const user = newUser();
    await page.goto('/');
    await registerViaApi(page, user);
    await page.goto(`/profile/${user.username}`);
    await expect(page).toHaveURL(new RegExp(`/profile/${user.username}$`, 'i'));
    await expect(page.getByRole('complementary', { name: 'Identity' }).getByText(`@${user.username}`, { exact: true })).toBeVisible();
    await expectCleanLoad(page, consoleErrors);
  });

  test('/profile/:username sends anonymous visitors to /login', async ({ page }) => {
    await page.goto('/profile/someone');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('unknown routes redirect home @smoke', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page).toHaveURL(/\/$/);
  });

  test('home page and API are up @smoke', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/KpopIt/);
    const res = await page.request.get('/api/gamemodes-count');
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).gamemodes_count).toBeGreaterThanOrEqual(3);
  });
});

test.describe('navbar, footer and home modals', () => {
  test('navbar dropdown links reach every section', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    for (const [menu, item, url] of [
      ['Games', 'Classic', /\/classic$/],
      ['Games', 'Blurry', /\/blurry$/],
      ['Games', 'Pixelated', /\/pixelated$/],
      ['Idols', 'All Idols', /\/idols$/],
    ] as const) {
      await nav.getByRole('button', { name: menu }).click();
      await nav.getByRole('link', { name: item }).click();
      await expect(page).toHaveURL(url);
      // A game page's first visit stores the server date and reloads once (safeReload):
      // wait for that reload, or the next dropdown click lands mid-reload.
      if (menu === 'Games') {
        await page.waitForFunction(() =>
          (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type === 'reload');
        await page.waitForLoadState('load');
      }
    }
    await nav.getByRole('link', { name: 'Collections' }).click();
    await expect(page).toHaveURL(/\/collections$/);
    await nav.getByRole('link', { name: 'Contact' }).click();
    await expect(page).toHaveURL(/\/contact$/);
    await nav.getByRole('link', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await nav.getByRole('link', { name: /Kpopit logo/ }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('mobile menu opens and navigates @mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-only menu');
    await page.goto('/');
    await page.locator('#mobile-menu-button').click();
    const nav = page.locator('nav');
    await nav.getByRole('button', { name: /^Games/ }).last().click();
    await nav.getByRole('link', { name: /Classic/ }).last().click();
    await expect(page).toHaveURL(/\/classic$/);
    // A game page's first visit of the day reloads once; let it settle so the
    // reload can't close the menu we open next.
    await expect(searchInput(page, 'classic')).toBeVisible({ timeout: 30_000 });
    await page.locator('#mobile-menu-button').click();
    await nav.getByRole('link', { name: 'Contact' }).last().click();
    await expect(page).toHaveURL(/\/contact$/);
  });

  test('footer links', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Privacy Policy' }).last().click();
    await expect(page).toHaveURL(/\/privacy-policy$/);
    await page.getByRole('link', { name: 'Contact', exact: true }).last().click();
    await expect(page).toHaveURL(/\/contact$/);
  });

  test('home game cards open each mode', async ({ page }) => {
    for (const mode of ['classic', 'blurry', 'pixelated']) {
      await page.goto('/');
      await page.locator(`main a[href="/${mode}"], a[href="/${mode}"]`).last().click();
      await expect(page).toHaveURL(new RegExp(`/${mode}$`));
    }
  });

  test('About and Changelog modals open and close', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'About' }).click();
    await expect(page.getByRole('heading', { name: 'About...' })).toBeVisible();
    await closeModal(page, 'About...');
    await page.getByRole('button', { name: 'Changelog' }).click();
    await expect(page.getByRole('heading', { name: 'Changelog...' })).toBeVisible();
    await closeModal(page, 'Changelog...');
  });
});
