import { test, expect, type Page } from './support/fixtures';
import {
  answerIdol, closeModal, guessIdol, openGame, searchInput, userToken, victoryMarker, wrongIdols,
} from './support/game';
import { dailyHistory, userIdByToken } from './support/db';

async function imageFilter(page: Page) {
  const style = await page.getByRole('img', { name: /^Blurry image of / }).first().getAttribute('style');
  const blur = Number(/blur\(([\d.]+)px\)/.exec(style ?? '')?.[1]);
  const gray = Number(/grayscale\(([\d.]+)%\)/.exec(style ?? '')?.[1]);
  return { blur, gray };
}

// The switches are plain clickable divs with no role, so find them next to their label.
const optionSwitch = (page: Page, label: RegExp) =>
  page.getByText(label).locator('xpath=following-sibling::div[1]');

test.describe('Blurry', () => {
  test('the photo sharpens with every guess', async ({ page }) => {
    await openGame(page, 'blurry');
    const answer = await answerIdol(page, 'blurry');
    expect(await imageFilter(page)).toEqual({ blur: 24, gray: 100 });

    const expected = [18, 14, 10];
    for (const [i, w] of (await wrongIdols(page, 'blurry', answer.id, 3)).entries()) {
      await guessIdol(page, 'blurry', w);
      await expect.poll(async () => (await imageFilter(page)).blur).toBe(expected[i]);
    }
  });

  test('Hardmode keeps the max blur; Color unlocks after 4 guesses', async ({ page }) => {
    await openGame(page, 'blurry');
    const answer = await answerIdol(page, 'blurry');
    await expect(page.getByText('Color (4)')).toBeVisible();

    await optionSwitch(page, /^Hardmode$/).click();
    const wrong = await wrongIdols(page, 'blurry', answer.id, 4);
    await guessIdol(page, 'blurry', wrong[0]);
    expect((await imageFilter(page)).blur).toBe(24);
    await optionSwitch(page, /^Hardmode$/).click();
    await expect.poll(async () => (await imageFilter(page)).blur).toBe(18);

    for (const w of wrong.slice(1)) await guessIdol(page, 'blurry', w);
    await expect(page.getByText(/^Color\s*$/)).toBeVisible();
    expect((await imageFilter(page)).gray).toBe(100);
    await optionSwitch(page, /^Color\s*$/).click();
    await expect.poll(async () => (await imageFilter(page)).gray).toBe(0);
    expect(await page.evaluate(() => localStorage.getItem('blurryColorMode'))).toBe('true');
  });

  test('group hint unlocks at 8 guesses', async ({ page }) => {
    test.setTimeout(240_000);
    await openGame(page, 'blurry');
    const answer = await answerIdol(page, 'blurry');
    for (const w of await wrongIdols(page, 'blurry', answer.id, 8)) await guessIdol(page, 'blurry', w);
    await page.getByRole('button', { name: 'Reveal Group Hint' }).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('blurryHintClicked'))).toBe('true');
  });

  test('win shows the victory card and the share line @smoke @mobile', async ({ page }) => {
    await openGame(page, 'blurry');
    const answer = await answerIdol(page, 'blurry');
    const [w] = await wrongIdols(page, 'blurry', answer.id, 1);
    await guessIdol(page, 'blurry', w);
    await guessIdol(page, 'blurry', answer);
    await expect(victoryMarker(page, 'blurry')).toBeVisible({ timeout: 45_000 });
    expect((await imageFilter(page)).blur).toBe(0);

    const userId = await userIdByToken(await userToken(page));
    expect((await dailyHistory(userId, 'blurry'))[0]).toMatchObject({ won: true, guesses_count: 2 });

    await page.getByRole('img', { name: 'Share' }).first().click();
    await expect(page.getByText(/Hardmode ❌/)).toBeVisible();
    await expect(page.getByText(/Grayscale ✅/)).toBeVisible();
    await closeModal(page, 'Share...');
  });

  test('reload mid-game restores guesses and blur level', async ({ page }) => {
    await openGame(page, 'blurry');
    const answer = await answerIdol(page, 'blurry');
    const wrong = await wrongIdols(page, 'blurry', answer.id, 2);
    for (const w of wrong) await guessIdol(page, 'blurry', w);
    await page.reload();
    await expect(searchInput(page, 'blurry')).toBeVisible();
    for (const w of wrong) await expect(page.getByText(w.artist_name).first()).toBeVisible();
    expect((await imageFilter(page)).blur).toBe(14);
  });

  test('reload after a win keeps the finished state', async ({ page }) => {
    await openGame(page, 'blurry');
    await guessIdol(page, 'blurry', await answerIdol(page, 'blurry'));
    await expect(victoryMarker(page, 'blurry')).toBeVisible({ timeout: 45_000 });
    await page.reload();
    await expect(victoryMarker(page, 'blurry')).toBeVisible();
    await expect(searchInput(page, 'blurry')).toBeHidden();
  });

  test('how to play and stats modals', async ({ page }) => {
    await openGame(page, 'blurry');
    await page.getByRole('button', { name: 'How to Play' }).click();
    await expect(page.getByRole('heading', { name: 'How to Play...' })).toBeVisible();
    await closeModal(page, 'How to Play...');
    await page.getByRole('img', { name: 'Stats' }).first().click();
    await expect(page.getByText('Games won')).toBeVisible();
    await closeModal(page, 'Stats...');
  });
});
