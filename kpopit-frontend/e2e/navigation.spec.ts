import { test, expect, type Page } from './support/fixtures';
import { expectLoggedOut, newUser, registerBeforeLoad } from './support/accounts';
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

  test('the idols list lays its cards out in a grid @smoke', async ({ page }) => {
    await page.goto('/idols');
    const cards = page.locator('a[href^="/idols/"]');
    await expect(cards.nth(1)).toBeVisible();
    const [a, b] = [await cards.nth(0).boundingBox(), await cards.nth(1).boundingBox()];
    // Side by side on one row, even on a phone (two columns at least): not a single stacked column.
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
    expect(b!.x).toBeGreaterThan(a!.x + a!.width - 1);
  });

  test('an idol page loads from the idols list @smoke', async ({ page, consoleErrors }) => {
    await page.goto('/idols');
    // Let the list's requests finish: WebKit reports requests cut by a navigation as errors.
    await page.waitForLoadState('networkidle');
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
    // Let the list's requests finish: WebKit reports requests cut by a navigation as errors.
    await page.waitForLoadState('networkidle');
    const link = page.locator('a[href^="/collections/"]').first();
    const href = await link.getAttribute('href');
    expect(href).toMatch(/^\/collections\/\d+\/[\w-]+$/);
    await page.goto(href!);
    await expect(page).toHaveURL(href!);
    await expectCleanLoad(page, consoleErrors);
  });

  test('the old /collection path is just an unknown route (the 404)', async ({ page }) => {
    await page.goto('/collection');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });

  test('/profile/:username loads for a logged-in user @smoke', async ({ page, consoleErrors }) => {
    const user = newUser();
    // One page load, then an in-app route change: a second page.goto would cancel the home
    // page's in-flight requests, which WebKit reports as page errors.
    await registerBeforeLoad(page, user);
    await page.goto('/');
    await page.getByRole('button', { name: /user menu/i }).filter({ visible: true }).first().click();
    await page.getByRole('link', { name: 'Profile' }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`/profile/${user.username}$`, 'i'));
    await expect(page.getByRole('complementary', { name: 'Identity' }).getByText(`@${user.username}`, { exact: true })).toBeVisible();
    await expectCleanLoad(page, consoleErrors);
  });

  test('/profile/:username sends anonymous visitors to /login', async ({ page }) => {
    await page.goto('/profile/someone');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('unknown routes show the 404 page @smoke', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page).toHaveURL(/\/this-route-does-not-exist$/);
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await page.getByRole('link', { name: "Play today's game" }).click();
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
      ['Idols', 'All idols', /\/idols$/],
      ['Idols', 'Albums', /\/albums$/],
      ['About', 'About', /\/about$/],
      ['About', 'How to play', /\/how-to-play$/],
      ['About', 'Changelog', /\/changelog$/],
      ['About', 'Blog', /\/blog$/],
      ['About', 'FAQ', /\/faq$/],
      ['About', 'Contact', /\/contact$/],
    ] as const) {
      await nav.getByRole('button', { name: menu, exact: true }).click();
      await nav.getByRole('menuitem', { name: new RegExp(`^${item}`) }).click();
      await expect(page).toHaveURL(url);
      // The URL changes before a heavy page (e.g. 300 album cards) commits, and a menu opened in
      // between belongs to the old page: wait for the navbar's page label of the new one.
      const label = item === 'All idols' ? 'idols' : item.toLowerCase();
      await expect(nav.getByRole('link', { name: 'KpopIt home' })).toContainText(label);
    }
    await nav.getByRole('link', { name: 'Collections' }).click();
    await expect(page).toHaveURL(/\/collections$/);
    await nav.getByRole('link', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await nav.getByRole('link', { name: 'KpopIt home' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('mobile menu opens and navigates @mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-only menu');
    await page.goto('/');
    const nav = page.locator('nav');
    await nav.getByRole('button', { name: 'Open menu' }).click();
    await nav.getByRole('button', { name: 'Games' }).click();
    await nav.getByRole('link', { name: 'Classic' }).click();
    await expect(page).toHaveURL(/\/classic$/);
    await expect(searchInput(page, 'classic')).toBeVisible({ timeout: 30_000 });
    await nav.getByRole('button', { name: 'Open menu' }).click();
    // The current page's section (Games) opens by default; About is one tap away.
    await nav.getByRole('button', { name: 'About' }).click();
    await nav.getByRole('link', { name: 'Contact' }).click();
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
    // The guest login link appears after the prerendered page hydrates.
    await expectLoggedOut(page);

    await page.locator('main').getByRole('button', { name: 'About' }).click();
    await expect(page.getByRole('heading', { name: 'About...' })).toBeVisible();
    await closeModal(page, 'About...');
    await page.getByRole('button', { name: 'Changelog' }).click();
    await expect(page.getByRole('heading', { name: 'Changelog...' })).toBeVisible();
    await closeModal(page, 'Changelog...');
  });
});
