import { test, expect } from './support/fixtures';
import { OffsetBackend } from './support/tomorrow';
import {
  DATE_KEY, answerAlbum, answerIdol, guessAlbum, guessIdol, openGame, searchInput, serverDate,
  userToken, victoryMarker,
} from './support/game';
import { dailyPick, userHistory, userIdByToken, type ModeName } from './support/db';

const tomorrow = new OffsetBackend(1);

test.beforeAll(async () => {
  await tomorrow.start();
});

test.afterAll(async () => {
  await tomorrow.stop();
});

const plusOneDay = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

async function winToday(page: import('@playwright/test').Page, mode: ModeName) {
  if (mode === 'pixelated') {
    const album = await answerAlbum(page);
    await guessAlbum(page, album);
    await expect(victoryMarker(page, mode)).toBeVisible({ timeout: 45_000 });
    return album.name;
  }
  const idol = await answerIdol(page, mode);
  await guessIdol(page, mode, idol);
  await expect(victoryMarker(page, mode)).toBeVisible({ timeout: 45_000 });
  return idol.artist_name;
}

test.describe('Day rollover (+1 day)', () => {
  for (const mode of ['classic', 'blurry', 'pixelated'] as const) {
    test(`${mode}: new pick, local state reset, streak continues, yesterday's answer shown`, async ({ page }) => {
      test.setTimeout(180_000);
      await openGame(page, mode);
      const today = await serverDate(page, mode);
      const todayName = await winToday(page, mode);
      const userId = await userIdByToken(await userToken(page));
      expect(await userHistory(userId, mode)).toMatchObject({ current_streak: 1 });

      await tomorrow.attach(page);
      await page.reload();
      await page.waitForFunction(
        ([key, day]) => localStorage.getItem(key) === day, [DATE_KEY[mode], plusOneDay(today)] as const,
      );
      await expect(searchInput(page, mode)).toBeVisible({ timeout: 30_000 });
      expect(await serverDate(page, mode)).toBe(plusOneDay(today));

      const leftovers = await page.evaluate(() =>
        ['todayGuessesDetails', 'gameComplete', 'blurryGuessesDetails', 'blurryGameComplete', 'pixelatedGuessesDetails']
          .map((k) => localStorage.getItem(k))
          .filter((v) => v && v !== '[]' && v !== 'false'));
      expect(leftovers).toEqual([]);

      // The 10-day cooldown guarantees a different pick on consecutive days.
      expect(await dailyPick(mode, plusOneDay(today))).not.toBe(await dailyPick(mode, today));

      const yesterdayLine = mode === 'pixelated' ? "Yesterday's album was" : "Yesterday's idol was";
      await expect(page.getByText(yesterdayLine)).toBeVisible();
      await expect(page.getByText(todayName, { exact: false }).first()).toBeVisible();

      await winToday(page, mode);
      await expect.poll(async () => (await userHistory(userId, mode))?.current_streak).toBe(2);
      expect(await userHistory(userId, mode)).toMatchObject({ wins_count: 2, max_streak: 2 });
    });
  }
});
