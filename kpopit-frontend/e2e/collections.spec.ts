import { test, expect, type Page } from './support/fixtures';
import { answerIdol, guessIdol, openGame, userToken, victoryMarker, type IdolEntry } from './support/game';
import { anyIdolWithCard, idolHasCard, seedIdolCard, userIdByToken, userIdByUsername, userIdolCard } from './support/db';
import { expectLoggedIn, newUser, registerBeforeLoad, registerViaApi } from './support/accounts';

type Mode = 'classic' | 'blurry';

// Cards are only granted for idols with an Album 1 card, so use whichever mode's answer has one.
async function modeWithCard(page: Page): Promise<{ mode: Mode; answer: IdolEntry } | null> {
  for (const mode of ['classic', 'blurry'] as const) {
    await openGame(page, mode);
    const answer = await answerIdol(page, mode);
    if (await idolHasCard(answer.id)) return { mode, answer };
  }
  return null;
}

async function skipOverlays(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('kpopit-collections-guide-seen', 'true');
    localStorage.setItem('kpopit-collections-hq-warned', 'true');
  });
}

test.describe('Collections', () => {
  test('winning grants the idol card and the album shows it owned', async ({ page }) => {
    const target = await modeWithCard(page);
    test.skip(!target, "neither today's Classic nor Blurry idol has an Album 1 card");
    const { mode, answer } = target!;

    await guessIdol(page, mode, answer);
    await expect(victoryMarker(page, mode)).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('New card collected!')).toBeVisible();

    const userId = await userIdByToken(await userToken(page));
    expect(await userIdolCard(userId, answer.id)).toEqual({ level: 1, times_won: 1 });

    await skipOverlays(page);
    const list = page.waitForResponse((r) => r.url().includes('/api/collections/list'));
    await page.getByRole('link', { name: /View your collections/ }).click();
    await expect(page).toHaveURL(/\/collections$/);
    const rows = await (await list).json();
    expect(rows[0].owned_cards).toBeGreaterThanOrEqual(1);

    const album = page.waitForResponse((r) => /\/api\/collections\/album\/\d+/.test(r.url()));
    await page.locator('a[href^="/collections/1/"]').first().click();
    const groups = await (await album).json();
    const members = groups.flatMap((g: { members: { idol_id: number; owned: boolean; level: number }[] }) => g.members);
    const mine = members.filter((m: { idol_id: number }) => m.idol_id === answer.id);
    expect(mine.length).toBeGreaterThan(0);
    for (const m of mine) expect(m).toMatchObject({ owned: true, level: 1 });
    expect(members.some((m: { owned: boolean }) => !m.owned)).toBe(true);
    await expect(page.getByText('Locked').first()).toBeAttached();
  });

  test('a repeat win levels the card up', async ({ page }) => {
    const target = await modeWithCard(page);
    test.skip(!target, "neither today's Classic nor Blurry idol has an Album 1 card");
    const { mode, answer } = target!;

    // Owning the card from an earlier day is what a real repeat win looks like.
    const userId = await userIdByToken(await userToken(page));
    await seedIdolCard(userId, answer.id, 1, 1);

    await guessIdol(page, mode, answer);
    await expect(victoryMarker(page, mode)).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('Card leveled up! — LV.2')).toBeVisible();
    expect(await userIdolCard(userId, answer.id)).toEqual({ level: 2, times_won: 2 });
  });

  test('the album tour: Enter is Next, but presses Back or Skip when reached with Tab', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('kpopit-collections-hq-warned', 'true'));
    await page.goto('/collections');
    await page.locator('a[href^="/collections/1/"]').first().click();
    const tour = page.getByRole('dialog', { name: 'Album tour' });
    await expect(tour.getByText(/^Step 1 of \d+$/)).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(tour.getByText(/^Step 2 of \d+$/)).toBeVisible();
    // A clicked Back keeps focus but no focus ring: Enter still means Next.
    await tour.getByRole('button', { name: 'Back' }).click();
    await expect(tour.getByText(/^Step 1 of \d+$/)).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(tour.getByText(/^Step 2 of \d+$/)).toBeVisible();

    const tabTo = async (name: string, key = 'Tab') => {
      for (let i = 0; i < 5 && !(await tour.getByRole('button', { name }).evaluate((el) => el === document.activeElement)); i++) {
        await page.keyboard.press(key);
      }
    };
    await tabTo('Back');
    await page.keyboard.press('Enter');
    await expect(tour.getByText(/^Step 1 of \d+$/)).toBeVisible();
    // Skip sits before Back.
    await tabTo('Skip', 'Shift+Tab');
    await page.keyboard.press('Enter');
    await expect(tour).toBeHidden();
  });

  test('the FX panel takes keyboard focus and hands it back to its button', async ({ page }) => {
    await skipOverlays(page);
    await page.goto('/collections');
    const toggle = page.locator('#fx-panel-toggle');
    const panel = page.getByRole('dialog', { name: 'Visual effects' });

    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(panel).toBeVisible();
    expect(await panel.evaluate((el) => el.contains(document.activeElement))).toBe(true);

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test('a failed collections list shows an error with Retry, not an empty page', async ({ page }) => {
    await skipOverlays(page);
    // Signed in: the route can't load ahead of the session, so the page's own query fetches the list.
    await registerBeforeLoad(page, newUser());
    await page.route(/\/api\/collections\/list/, (route) => route.fulfill({ status: 500, json: { error: 'down' } }));
    await page.goto('/collections');
    await expect(page.getByText('Error loading your collections.')).toBeVisible({ timeout: 30_000 });

    await page.unroute(/\/api\/collections\/list/);
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByText(/% complete/).first()).toBeVisible();
  });

  test("widening past lg closes the album's phone-only Focus mode and index", async ({ page, isMobile }) => {
    test.skip(isMobile, 'resizes a desktop window');
    await skipOverlays(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/collections');
    await page.locator('a[href^="/collections/1/"]').first().click();
    const root = page.locator('[data-focus]');

    await page.locator('[data-tour="focus"]').click();
    await expect(root).toHaveAttribute('data-focus', 'on');
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(root).toHaveAttribute('data-focus', 'off');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-tour="summary"]').click();
    const search = page.getByPlaceholder(/^Search for a group/);
    await expect(search).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
    // The desktop rail keeps its own search; the modal's copy goes away.
    await expect(search).toHaveCount(1);
  });

  test('anonymous visitor sees the collections list and a locked album', async ({ page }) => {
    await skipOverlays(page);
    await page.goto('/collections');
    await expect(page.getByText('Kpopit Collections').first()).toBeVisible();
    await expect(page.getByText(/% complete/).first()).toBeVisible();
    await page.locator('a[href^="/collections/1/"]').first().click();
    await expect(page).toHaveURL(/\/collections\/1\//);
  });
});

// An expired access token used to be served as anonymous (200, nothing owned: 0% until F5).
// Now it is a 401, the client refreshes, and the replay shows the owned card.
test('an expired access token on the collections list is refreshed, not cached as empty', async ({ page }) => {
  const user = newUser();
  await page.goto('/');
  await registerViaApi(page, user);
  await page.reload();
  await expectLoggedIn(page);
  await seedIdolCard(await userIdByUsername(user.username), await anyIdolWithCard());
  await skipOverlays(page);

  let forged = false;
  await page.route('**/api/collections/list**', async (route) => {
    if (forged) return route.fallback();
    forged = true;
    await route.fallback({ headers: { ...route.request().headers(), authorization: 'Bearer expired.or.forged' } });
  });
  const rejected = page.waitForResponse((r) => r.url().includes('/api/collections/list') && r.status() === 401);
  const replayed = page.waitForResponse((r) => r.url().includes('/api/collections/list') && r.status() === 200);
  await page.locator('nav').getByRole('link', { name: 'Collections' }).click();
  await rejected;
  const rows = await (await replayed).json();
  expect(rows[0].owned_cards).toBe(1);
  await expect(page.getByText(/^1\/\d+ stickers$/).first()).toBeVisible();
});

test.describe('Collections off on the backend', () => {
  test.beforeAll(async ({ backend }) => {
    await backend.restart(0, { COLLECTION_ENABLED: 'false' });
  });
  test.afterAll(async ({ backend }) => {
    await backend.restart(0, {});
  });

  test('the list and an album are the 404, and the navbar has no Collections link', async ({ page }) => {
    await page.goto('/collections');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await expect(page.locator('nav').getByRole('link', { name: 'Collections' })).toHaveCount(0);

    await page.goto('/collections/1/official-collection');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });
});
