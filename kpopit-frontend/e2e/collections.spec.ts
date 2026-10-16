import { test, expect, type Page } from './support/fixtures';
import { answerIdol, guessIdol, openGame, userToken, victoryMarker, type IdolEntry } from './support/game';
import { idolHasCard, seedIdolCard, userIdByToken, userIdolCard } from './support/db';

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
