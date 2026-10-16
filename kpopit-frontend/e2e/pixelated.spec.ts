import { test, expect, type Page } from './support/fixtures';
import {
  albumsList, answerAlbum, closeModal, guessAlbum, openGame, searchInput, userToken, victoryMarker, wrongAlbums,
} from './support/game';
import { dailyHistory, userIdByToken } from './support/db';

const cover = (page: Page) => page.getByRole('img', { name: 'Pixelated album cover' }).last();

/** PNG snapshot of the sleeve cover; more mosaic cells = more detail = bigger PNG. */
async function coverShot(page: Page): Promise<Buffer> {
  await page.waitForTimeout(400); // canvas re-render after the guess
  return cover(page).screenshot();
}

test.describe('Pixelated', () => {
  test('album search finds albums by name and by group', async ({ page }) => {
    await openGame(page, 'pixelated');
    const answer = await answerAlbum(page);
    const [other] = await wrongAlbums(page, answer.id, 1);
    const input = searchInput(page, 'pixelated');
    await input.fill(other.name);
    await expect(page.locator('li').filter({ hasText: other.name }).first()).toBeVisible();
    await input.fill(other.group_name);
    await expect(page.locator('li').filter({ hasText: other.group_name }).first()).toBeVisible();
    expect((await albumsList(page)).length).toBeGreaterThan(1);
  });

  test('the cover sharpens with every guess and year/artist hints unlock', async ({ page }) => {
    test.setTimeout(240_000);
    await openGame(page, 'pixelated');
    const answer = await answerAlbum(page);
    await expect(cover(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Release Year hint' })).toHaveCount(0);
    await expect(page.locator('[aria-label="Release Year hint, locked"]')).toBeVisible();

    const shots = [await coverShot(page)];
    const wrong = await wrongAlbums(page, answer.id, 6);
    for (const [i, a] of wrong.entries()) {
      await guessAlbum(page, a);
      shots.push(await coverShot(page));
      expect(shots[i + 1].equals(shots[i]), `cover changed after guess ${i + 1}`).toBe(false);
      if (i + 1 === 3) {
        await page.getByRole('button', { name: 'Release Year hint' }).click();
        await expect.poll(() => page.evaluate(() => localStorage.getItem('pixelatedHint1Revealed'))).toBe('true');
      }
    }
    expect(shots[6].length, 'cover holds more detail after 6 guesses').toBeGreaterThan(shots[0].length);
    await page.getByRole('button', { name: 'Artist hint' }).click();
    await expect(page.getByText(answer.group_name, { exact: true }).first()).toBeVisible();
  });

  test('win shows the victory card @smoke @mobile', async ({ page }) => {
    await openGame(page, 'pixelated');
    const answer = await answerAlbum(page);
    const [w] = await wrongAlbums(page, answer.id, 1);
    await guessAlbum(page, w);
    await guessAlbum(page, answer);
    await expect(victoryMarker(page, 'pixelated')).toBeVisible({ timeout: 45_000 });
    await expect(searchInput(page, 'pixelated')).toBeHidden();
    const userId = await userIdByToken(await userToken(page));
    expect((await dailyHistory(userId, 'pixelated'))[0]).toMatchObject({ won: true, guesses_count: 2 });
  });

  test('reload mid-game restores the guesses', async ({ page }) => {
    await openGame(page, 'pixelated');
    const answer = await answerAlbum(page);
    const wrong = await wrongAlbums(page, answer.id, 2);
    for (const a of wrong) await guessAlbum(page, a);
    await page.reload();
    await expect(searchInput(page, 'pixelated')).toBeVisible();
    for (const a of wrong) await expect(page.getByText(a.name).first()).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pixelatedGuessesDetails') || '[]').length)).toBe(2);
  });

  test('reload after a win keeps the finished state', async ({ page }) => {
    await openGame(page, 'pixelated');
    await guessAlbum(page, await answerAlbum(page));
    await expect(victoryMarker(page, 'pixelated')).toBeVisible({ timeout: 45_000 });
    await page.reload();
    await expect(victoryMarker(page, 'pixelated')).toBeVisible();
    await expect(searchInput(page, 'pixelated')).toBeHidden();
  });

  test('stats modal opens and closes', async ({ page }) => {
    await openGame(page, 'pixelated');
    await page.getByRole('button', { name: 'Your stats' }).first().click();
    await expect(page.getByText('Games won')).toBeVisible();
    await closeModal(page, 'Stats...');
  });
});
