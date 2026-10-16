import { test, expect } from './support/fixtures';
import { OffsetBackend } from './support/tomorrow';
import { expectLoggedIn, newUser, registerViaApi } from './support/accounts';
import { serverDate, winGame } from './support/game';
import { dailyHistory, userHistory, userIdByUsername } from './support/db';

// Four backends on the same DB, each one game day further ahead (+1..+4). The access JWT
// and refresh cookie come from the real clock, so one session must survive all four days.
const DAYS = [1, 2, 3, 4];
const backends = DAYS.map((offset) => new OffsetBackend(offset));

test.beforeAll(async () => {
  test.setTimeout(240_000);
  await Promise.all(backends.map((b) => b.start()));
});

test.afterAll(async () => {
  await Promise.all(backends.map((b) => b.stop()));
});

test('logged-in account plays four consecutive days: streak 1→4, one row per day, session kept', async ({ page }) => {
  test.setTimeout(420_000);
  const user = newUser();
  await page.goto('/');
  await registerViaApi(page, user);
  const userId = await userIdByUsername(user.username);
  const playedDates: string[] = [];

  for (const [i, backend] of backends.entries()) {
    await OffsetBackend.detach(page);
    await backend.attach(page);
    await page.goto('/');
    await expectLoggedIn(page);

    await winGame(page, 'classic');
    playedDates.push(await serverDate(page, 'classic'));

    await expect.poll(async () => (await userHistory(userId, 'classic'))?.current_streak).toBe(i + 1);

    const refreshStatus = await page.evaluate(async () => (await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })).status);
    expect(refreshStatus, `refresh on day +${backend.offset}`).toBe(200);
  }

  expect(new Set(playedDates).size).toBe(DAYS.length);
  const rows = await dailyHistory(userId, 'classic');
  expect(rows.map((r) => r.date)).toEqual(playedDates);
  expect(rows.every((r) => r.won)).toBe(true);
  expect(await userHistory(userId, 'classic')).toMatchObject({ current_streak: 4, max_streak: 4, wins_count: 4 });
});
