import { test, expect } from './support/fixtures';
import { openGame, searchInput, serverDate, idolsList } from './support/game';
import { dailyPick, ensurePastPick } from './support/db';

const CALENDAR_ON = { CALENDAR_ENABLED: 'true' };
const minusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

test.beforeAll(async ({ backend }) => {
  await backend.restart(0, CALENDAR_ON);
});
test.afterAll(async ({ backend }) => {
  await backend.restart(0, {});
});

test.describe('calendar @mobile', () => {
  const gameMetadata = [
    ['classic', 'Classic', 'KpopIt Classic - K-pop Idol Guessing Game'],
    ['blurry', 'Blurry', 'KpopIt Blurry - K-pop Idol Image Guessing Game'],
    ['pixelated', 'Pixelated', 'KpopIt Pixelated - K-pop Album Cover Guessing Game'],
  ] as const;

  for (const [mode, name, liveTitle] of gameMetadata) {
    test(`${name} indexes the live game and labels a past calendar day`, async ({ page }) => {
      const canonical = page.locator('head link[rel="canonical"]');
      const robots = page.locator('head meta[name="robots"]');
      const description = page.locator('head meta[name="description"]');
      const canonicalUrl = `https://kpopit.net/${mode}`;

      await openGame(page, mode);
      await expect(page).toHaveTitle(liveTitle);
      await expect(canonical).toHaveAttribute('href', canonicalUrl);
      await expect(robots).toHaveAttribute('content', 'index, follow');

      const today = await serverDate(page, mode);
      const yesterday = minusDays(today, 1);
      await ensurePastPick(mode, yesterday, today);

      const response = page.waitForResponse((reply) =>
        new URL(reply.url()).pathname === `/api/calendar/${mode}/${yesterday}` && reply.request().method() === 'GET');
      await page.goto(`/${mode}?date=${yesterday}`);
      const day = await response;
      expect(day.ok()).toBeTruthy();
      const { day_number: dayNumber } = await day.json();
      expect(dayNumber).toBeGreaterThan(0);

      await expect(page).toHaveTitle(`${name} · Day ${dayNumber} – KpopIt`);
      await expect(canonical).toHaveAttribute('href', canonicalUrl);
      await expect(robots).toHaveAttribute('content', 'noindex, follow');
      await expect(description).toHaveAttribute('content', `Play a past ${name} challenge from the KpopIt calendar.`);

      await page.goBack();
      await expect(page).toHaveTitle(liveTitle);
      await expect(robots).toHaveAttribute('content', 'index, follow');
    });
  }

  test('month view selects a day into the URL and its panel links to the past game', async ({ page, consoleErrors }) => {
    await openGame(page, 'classic');
    const today = await serverDate(page, 'classic');
    const yesterday = minusDays(today, 1);
    await ensurePastPick('classic', yesterday, today);

    await page.goto('/calendar');
    await expect(page.getByRole('heading', { name: 'Calendar', level: 1 })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Classic' })).toHaveAttribute('aria-selected', 'true');
    // Today's panel sends the player to the live game.
    await expect(page.getByRole('link', { name: 'Go to Classic' }).first()).toHaveAttribute('href', '/classic');

    // On the 1st of a month yesterday sits in the previous month's grid.
    if (yesterday.slice(0, 7) !== today.slice(0, 7)) await page.locator('button[aria-label="Previous month"]:visible').first().click();
    await page.locator(`button[data-date="${yesterday}"]:visible`).click();
    await expect(page).toHaveURL(new RegExp(`mode=classic&date=${yesterday}`));
    const play = page.getByRole('link', { name: /^Play Day \d+$/ }).first();
    await expect(play).toHaveAttribute('href', `/classic?date=${yesterday}`);
    expect(consoleErrors.list).toEqual([]);
  });

  test('timeline view lists days and flips its order', async ({ page }) => {
    await page.goto('/calendar');
    await page.getByRole('tab', { name: 'Timeline' }).click();
    await expect(page.getByRole('button', { name: /^Day 1, / })).toBeVisible();
    await page.getByRole('button', { name: 'From Day 1' }).click();
    await expect(page.getByRole('button', { name: 'From Day 1' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /^Day \d+, / }).first()).toHaveAccessibleName(/^Day 1, /);
  });

  test('a deep link opens that mode and day', async ({ page }) => {
    await openGame(page, 'blurry');
    const today = await serverDate(page, 'blurry');
    const yesterday = minusDays(today, 1);
    await ensurePastPick('blurry', yesterday, today);
    await page.goto(`/calendar?mode=blurry&date=${yesterday}`);
    await expect(page.getByRole('tab', { name: 'Blurry' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('link', { name: /^Play Day \d+$/ }).first()).toHaveAttribute('href', `/blurry?date=${yesterday}`);
  });

  test("yesterday's locked pill opens the calendar on that day, and a calendar win shows there", async ({ page }) => {
    test.setTimeout(120_000);
    await openGame(page, 'classic');
    const today = await serverDate(page, 'classic');
    const yesterday = minusDays(today, 1);
    await ensurePastPick('classic', yesterday, today);
    await page.reload();

    const pill = page.getByRole('link', { name: 'Play yesterday in the calendar' });
    await expect(pill).toHaveAttribute('href', `/calendar?mode=classic&date=${yesterday}`);
    await pill.click();
    await expect(page).toHaveURL(new RegExp(`/calendar\\?mode=classic&date=${yesterday}`));

    await page.getByRole('link', { name: /^Play Day \d+$/ }).first().click();
    await expect(page).toHaveURL(new RegExp(`/classic\\?date=${yesterday}`));
    const answerId = await dailyPick('classic', yesterday);
    const idol = (await idolsList(page)).find((i) => i.id === answerId)!;
    const input = searchInput(page, 'classic');
    await input.fill(idol.artist_name);
    await page.locator('li').filter({ hasText: idol.artist_name }).first().click();
    const response = page.waitForResponse((r) => r.url().includes(`/api/calendar/classic/${yesterday}/guess`) && r.request().method() === 'POST');
    await input.press('Enter');
    expect((await response).ok()).toBeTruthy();
    await expect(page.getByText('You found it!')).toBeVisible();

    await page.locator('main').getByRole('link', { name: 'Calendar', exact: true }).click();
    await expect(page.getByText(/^Played from the calendar · /).filter({ visible: true }).first()).toBeVisible();
  });
});
