import { test, expect, type Page } from './support/fixtures';
import { answerIdol, guessIdol, openGame, userToken, victoryMarker, type IdolEntry } from './support/game';
import { anyIdolWithCard, idolHasCard, seedIdolCard, userIdByToken, userIdByUsername, userIdolCard } from './support/db';
import { expectLoggedIn, newUser, registerViaApi } from './support/accounts';

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

  test('anonymous visitor sees the collections list and a locked album', async ({ page }) => {
    await skipOverlays(page);
    await page.goto('/collections');
    await expect(page.getByText('Kpopit Collections').first()).toBeVisible();
    await expect(page.getByText(/% complete/).first()).toBeVisible();
    await page.locator('a[href^="/collections/1/"]').first().click();
    await expect(page).toHaveURL(/\/collections\/1\//);
  });
});

// T33: an expired access token used to be served as anonymous (200, nothing owned), so the album
// showed 0% until F5. Now the backend answers 401, the client refreshes, and the replay is owned.
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
