import { test, expect } from './support/fixtures';
import {
  answerIdol, closeModal, guessIdol, idolsList, openGame, searchInput, serverDate,
  userToken, victoryMarker, wrongIdols,
} from './support/game';
import { dailyHistory, ensurePastIdolPick, userHistory, userIdByToken } from './support/db';

const minusOneDay = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

// Guess rows render the idol as "Name (Group)" in a single element.
const rowTile = (page: import('@playwright/test').Page, i: { artist_name: string; active_group: string | null }) =>
  page.getByText(`${i.artist_name} (${i.active_group || 'Soloist'})`).first();

const FEEDBACK_KEYS = ['groups', 'companies', 'nationality', 'birth_date', 'idol_debut_year', 'height', 'position'];
const HEADERS = ['Idol', 'Group(s)', 'Company', 'Nationality', 'Birth Date', 'Debut Year', 'Height', 'Position(s)'];

test.describe('Classic', () => {
  test('search finds idols by name and by group', async ({ page }) => {
    await openGame(page, 'classic');
    const answer = await answerIdol(page, 'classic');
    const [other] = await wrongIdols(page, 'classic', answer.id, 1);
    const input = searchInput(page, 'classic');

    await input.fill(other.artist_name.slice(0, 3));
    await expect(page.locator('li').filter({ hasText: other.artist_name }).first()).toBeVisible();

    const groupIdol = (await idolsList(page)).find((i) => i.active_group && i.id !== answer.id)!;
    await input.fill(groupIdol.active_group!);
    await expect(page.locator('li').filter({ hasText: `(${groupIdol.active_group})` }).first()).toBeVisible();

    await input.fill('zzzzqqqq');
    await expect(page.locator('li')).toHaveCount(0);
  });

  test('a wrong guess shows a feedback row with every attribute', async ({ page }) => {
    await openGame(page, 'classic');
    const answer = await answerIdol(page, 'classic');
    const [wrong] = await wrongIdols(page, 'classic', answer.id, 1);
    await guessIdol(page, 'classic', wrong);

    for (const h of HEADERS) await expect(page.getByText(h, { exact: true }).first()).toBeVisible();
    await expect(rowTile(page, wrong).first()).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('todayGuessesDetails') || '[]'));
    expect(stored).toHaveLength(1);
    expect(stored[0].guess_correct).toBe(false);
    for (const k of FEEDBACK_KEYS) expect(stored[0].feedback[k]?.status, k).toBeTruthy();
    await expect(searchInput(page, 'classic')).toBeVisible();
    await expect(page.getByText(/Guess\s*5\s*more idols to reveal the hint/).first()).toBeVisible();
  });

  test('win in N guesses records the game @smoke @mobile', async ({ page }) => {
    await openGame(page, 'classic');
    const answer = await answerIdol(page, 'classic');
    for (const w of await wrongIdols(page, 'classic', answer.id, 3)) await guessIdol(page, 'classic', w);
    await guessIdol(page, 'classic', answer);
    await expect(victoryMarker(page, 'classic')).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('Congratulations!')).toBeVisible();
    await expect(searchInput(page, 'classic')).toBeHidden();

    const userId = await userIdByToken(await userToken(page));
    const today = await serverDate(page, 'classic');
    const rows = await dailyHistory(userId, 'classic');
    expect(rows).toEqual([expect.objectContaining({ date: today, won: true, guesses_count: 4 })]);
    const agg = await userHistory(userId, 'classic');
    expect(agg).toMatchObject({ wins_count: 1, current_streak: 1, one_shot_wins: 0 });
  });

  test('one-shot win is counted as one-shot', async ({ page }) => {
    await openGame(page, 'classic');
    await guessIdol(page, 'classic', await answerIdol(page, 'classic'));
    await expect(victoryMarker(page, 'classic')).toBeVisible({ timeout: 45_000 });

    const userId = await userIdByToken(await userToken(page));
    expect(await userHistory(userId, 'classic')).toMatchObject({ wins_count: 1, one_shot_wins: 1 });

    await page.getByRole('img', { name: 'Stats' }).first().click();
    const modal = page.getByRole('heading', { name: 'Stats...' }).locator('xpath=../..');
    await expect(modal.getByText('One Shot Wins')).toBeVisible();
    await closeModal(page, 'Stats...');
  });

  test('hints unlock at 6 and 8 guesses', async ({ page }) => {
    test.setTimeout(240_000);
    await openGame(page, 'classic');
    const answer = await answerIdol(page, 'classic');
    const wrong = await wrongIdols(page, 'classic', answer.id, 8);
    await expect(page.getByText('Guess any idol to start the game!')).toBeVisible();

    for (const w of wrong.slice(0, 6)) await guessIdol(page, 'classic', w);
    await expect(page.getByText('Click to reveal the hint!').first()).toBeVisible();
    await expect(page.getByText(/Guess\s*2\s*more idols to reveal the hint/)).toBeVisible();
    await page.getByText('Hint 1', { exact: true }).click();
    await expect(page.getByText('Group Members')).toBeVisible();

    for (const w of wrong.slice(6, 8)) await guessIdol(page, 'classic', w);
    await page.getByText('Hint 2', { exact: true }).click();
    await expect(page.getByText(/^Groups?$/).first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => [localStorage.getItem('hint1Revealed'), localStorage.getItem('hint2Revealed')]))
      .toEqual(['true', 'true']);
  });

  test('top buttons: how to play, stats → transfer data, share', async ({ page }) => {
    await openGame(page, 'classic');
    await page.getByRole('button', { name: 'How to Play' }).click();
    await expect(page.getByRole('heading', { name: 'How to Play...' })).toBeVisible();
    await closeModal(page, 'How to Play...');

    await page.getByRole('img', { name: 'Share' }).first().click();
    await expect(page.getByText("Make your first guess to start today's challenge!")).toBeVisible();
    await closeModal(page, 'Share...');

    await page.getByRole('img', { name: 'Stats' }).first().click();
    await expect(page.getByText('Games won')).toBeVisible();
    await page.getByRole('button', { name: /transfer/i }).click();
    await expect(page.getByRole('heading', { name: 'Transfer Data...' })).toBeVisible();
    await page.getByRole('button', { name: /export/i }).click();
    await expect(page.getByRole('heading', { name: 'Export Data...' })).toBeVisible();
    await closeModal(page, 'Export Data...');
  });

  test('victory card, stats and share after a win', async ({ page }) => {
    await openGame(page, 'classic');
    const answer = await answerIdol(page, 'classic');
    const [w] = await wrongIdols(page, 'classic', answer.id, 1);
    await guessIdol(page, 'classic', w);
    await guessIdol(page, 'classic', answer);
    await expect(victoryMarker(page, 'classic')).toBeVisible({ timeout: 45_000 });

    await page.getByRole('img', { name: 'Share' }).first().click();
    await expect(page.getByText("I found today's #KpopIt Idol in 2 attempts! 🎤")).toBeVisible();
    await closeModal(page, 'Share...');

    await page.getByRole('img', { name: 'Stats' }).first().click();
    await expect(page.getByText('Games won')).toBeVisible();
    await expect(page.getByText('Current Streak')).toBeVisible();
    await closeModal(page, 'Stats...');
  });

  test('reload mid-game restores the guesses', async ({ page }) => {
    await openGame(page, 'classic');
    const answer = await answerIdol(page, 'classic');
    const wrong = await wrongIdols(page, 'classic', answer.id, 2);
    for (const w of wrong) await guessIdol(page, 'classic', w);

    await page.reload();
    await expect(searchInput(page, 'classic')).toBeVisible();
    for (const w of wrong) await expect(rowTile(page, w).first()).toBeVisible();
    await expect(page.getByText(/Guess\s*4\s*more idols to reveal the hint/).first()).toBeVisible();

    await guessIdol(page, 'classic', answer);
    await expect(victoryMarker(page, 'classic')).toBeVisible({ timeout: 45_000 });
    const userId = await userIdByToken(await userToken(page));
    expect((await dailyHistory(userId, 'classic'))[0]).toMatchObject({ won: true, guesses_count: 3 });
  });

  test('reload after a win keeps the finished state', async ({ page }) => {
    await openGame(page, 'classic');
    await guessIdol(page, 'classic', await answerIdol(page, 'classic'));
    await expect(victoryMarker(page, 'classic')).toBeVisible({ timeout: 45_000 });
    await page.reload();
    await expect(victoryMarker(page, 'classic')).toBeVisible();
    await expect(searchInput(page, 'classic')).toBeHidden();
  });

  test("yesterday's idol is linked while playing", async ({ page }) => {
    await openGame(page, 'classic');
    const today = await serverDate(page, 'classic');
    await ensurePastIdolPick('classic', minusOneDay(today), today);
    await page.reload();
    const res = await page.request.get('/api/store-yesterdays-idol?gamemode_id=1');
    const body = await res.json();
    expect(body.past_idol_id).toBeTruthy();
    const link = page.getByRole('link').filter({ hasText: body.artist_name });
    await expect(page.getByText("Yesterday's idol was")).toBeVisible();
    await link.first().click();
    await expect(page).toHaveURL(new RegExp(`/idols/${body.past_idol_id}/`));
  });
});
