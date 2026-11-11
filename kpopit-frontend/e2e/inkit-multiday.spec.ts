import { test, expect } from './support/fixtures';
import { DATE_KEY, idolsList, userToken } from './support/game';
import { dailyHistory, dailyPick, userHistory, userIdByToken } from './support/db';

// Three weeks of InkIt on the real server: one backend restart per game day. Each day the
// payload must hide the answer, start a fresh game, and keep the 10-day cooldown.
const DAYS = 21;
const INKIT_ON = { INKIT_ENABLED: 'true', CALENDAR_ENABLED: 'true' };

test.afterAll(async ({ backend }) => {
  await backend.restart(0, {});
});

test('three weeks of InkIt: a fresh hidden answer every day, wins and the streak add up', async ({ page, backend }) => {
  test.setTimeout(900_000);
  await backend.restart(0, INKIT_ON);
  await page.goto('/inkit');
  await page.waitForFunction((key) => !!localStorage.getItem(key), DATE_KEY.inkit, { timeout: 30_000 });
  const token = await userToken(page);
  const userId = await userIdByToken(token);
  const idols = await idolsList(page);
  const answers: number[] = [];
  const dates: string[] = [];
  let firstDayNumber: number | null = null;

  for (let offset = 0; offset < DAYS; offset++) {
    if (offset > 0) await backend.restart(offset, INKIT_ON);

    const daily = await page.request.get('/api/game/inkit/daily', { headers: { Authorization: token } });
    expect(daily.status()).toBe(200);
    const day = await daily.json();
    const answerId = await dailyPick('inkit', day.server_date);
    const answer = idols.find((idol) => idol.id === answerId)!;

    expect(day.game, `day +${offset} starts fresh`).toBeNull();
    expect(JSON.stringify(day)).not.toContain(answer.artist_name);
    expect(answers.slice(-10), `day +${offset} respects the cooldown`).not.toContain(answerId);
    firstDayNumber ??= day.day_number;
    expect(day.day_number).toBe(firstDayNumber! + offset);

    const wrong = idols.find((idol) => idol.id !== answerId && !answers.includes(idol.id))!;
    const miss = await page.request.post('/api/game/inkit/guess', {
      headers: { Authorization: token }, data: { guessed_idol_id: wrong.id, game_date: day.server_date },
    });
    expect((await miss.json()).answer).toBeNull();

    // Day +10 is skipped: the streak breaks there and starts again.
    if (offset !== 10) {
      const hit = await page.request.post('/api/game/inkit/guess', {
        headers: { Authorization: token }, data: { guessed_idol_id: answerId, game_date: day.server_date },
      });
      expect((await hit.json()).answer.idol_id).toBe(answerId);
    }

    // Once a week, the page itself on that day.
    if (offset % 7 === 6) {
      await page.goto('/inkit');
      await expect(page.getByTestId('inkit-victory')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId('inkit-day-number')).toContainText(String(day.day_number));
    }

    answers.push(answerId);
    dates.push(day.server_date);
  }

  expect(new Set(dates).size).toBe(DAYS);
  const rows = await dailyHistory(userId, 'inkit');
  expect(rows).toHaveLength(DAYS);
  expect(rows.filter((row) => row.won)).toHaveLength(DAYS - 1);
  expect(await userHistory(userId, 'inkit')).toMatchObject({ wins_count: DAYS - 1, max_streak: 10, current_streak: 10 });
});
