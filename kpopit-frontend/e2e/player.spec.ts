import { test, expect, ipHeader } from './support/fixtures';
import { newUser, registerViaApi, loginViaUi, expectLoggedOut } from './support/accounts';
import { openGame, serverDate, userToken } from './support/game';
import { dailyPick, deletionRequested, ensurePastPick, idolName, seedWin, userIdByToken, userIdByUsername } from './support/db';

const PLAYER_ON = { IDOL_XP_ENABLED: 'true', PUBLIC_PROFILE_ENABLED: 'true', CALENDAR_ENABLED: 'true' };
const minusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

test.beforeAll(async ({ backend }) => {
  await backend.restart(0, PLAYER_ON);
});
test.afterAll(async ({ backend }) => {
  await backend.restart(0, {});
});

test.describe('idol xp @mobile', () => {
  test('guests see their potion and a sign-up invite, without picking', async ({ page, consoleErrors }) => {
    await openGame(page, 'classic');
    await page.goto('/idol-xp');
    await expect(page.getByRole('heading', { name: 'Idol XP', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your potion is filling up...' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Filter idols' })).toHaveCount(0);
    expect(consoleErrors.list).toEqual([]);
  });

  test('a member picks an idol, confirms and pours the potion into them', async ({ page }) => {
    const user = newUser();
    await openGame(page, 'classic');
    const today = await serverDate(page, 'classic');
    await registerViaApi(page, user);
    const userId = await userIdByUsername(user.username);
    for (let n = 1; n <= 3; n++) await seedWin(userId, 'classic', minusDays(today, n), 4);  // 3 × 10 XP, no idol picked

    await page.goto('/idol-xp');
    await expect(page.getByText('30 / 150').first()).toBeVisible();
    const card = page.getByRole('button', { name: /level 0$/ }).first();
    const name = (await card.getAttribute('aria-label'))!.split(',')[0];
    await card.click();
    const confirm = page.getByRole('dialog', { name: 'Switch idol' });
    await expect(confirm).toContainText(`Level up ${name}?`);
    await confirm.getByRole('button', { name: 'Switch' }).click();
    await expect(page.getByText('LEVELING NOW')).toBeVisible();

    const pour = page.waitForResponse((r) => r.url().includes('/api/idol-xp/pour'));
    await page.getByRole('button', { name: `Pour into ${name}` }).click();
    expect((await pour).status()).toBe(200);
    await expect(page.getByRole('status').filter({ hasText: `+30 XP to ${name}` })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Potion is empty' })).toBeDisabled();
    await expect(page.getByText('0 / 150').first()).toBeVisible();
  });
});

test.describe('public profile @mobile', () => {
  test('the owner sees every game and the settings entry', async ({ page }) => {
    const user = newUser();
    await openGame(page, 'classic');
    const today = await serverDate(page, 'classic');
    const yesterday = minusDays(today, 1);
    await ensurePastPick('classic', yesterday, today);
    await registerViaApi(page, user);
    await seedWin(await userIdByUsername(user.username), 'classic', yesterday, 4);

    await page.goto(`/profile/${user.username}?tab=history`);
    await expect(page.getByRole('button', { name: 'Edit profile' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'History' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText(await idolName(await dailyPick('classic', yesterday)), { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Play this day' })).toHaveCount(0);
  });

  test('a visitor gets locked days with a link to play them, and answers only for days they finished', async ({ page }) => {
    await openGame(page, 'classic');
    const today = await serverDate(page, 'classic');
    const [yesterday, older] = [minusDays(today, 1), minusDays(today, 2)];
    await ensurePastPick('classic', yesterday, today);
    await ensurePastPick('classic', older, today);

    // The owner exists through the API only; this page stays an anonymous visitor.
    const owner = newUser();
    const res = await page.request.post('/api/auth/register', { headers: ipHeader(), data: { username: owner.username, password: owner.password } });
    expect(res.status()).toBe(201);
    const ownerId = await userIdByUsername(owner.username);
    await seedWin(ownerId, 'classic', yesterday);
    await seedWin(ownerId, 'classic', older);
    await seedWin(await userIdByToken(await userToken(page)), 'classic', yesterday);

    await page.goto(`/profile/${owner.username}?tab=history`);
    await expect(page.getByRole('button', { name: 'Edit profile' })).toHaveCount(0);
    await expect(page.getByText(await idolName(await dailyPick('classic', yesterday)), { exact: true })).toBeVisible();
    const play = page.getByRole('link', { name: 'Play this day' });
    await expect(play).toHaveCount(1);
    await expect(play).toHaveAttribute('href', `/calendar?mode=classic&date=${older}`);
    await expect(page.getByText(await idolName(await dailyPick('classic', older)), { exact: true })).toHaveCount(0);
  });
});

test.describe('settings', () => {
  test('privacy switches persist', async ({ page }) => {
    const user = newUser();
    await page.goto('/');
    await registerViaApi(page, user);
    await page.goto(`/profile/${user.username}`);
    await page.getByRole('button', { name: 'Edit profile' }).click();
    const activity = page.getByRole('switch', { name: 'Activity' });
    await expect(activity).toHaveAttribute('aria-checked', 'true');
    const saved = page.waitForResponse((r) => r.url().includes('/api/user/profile/settings') && r.request().method() === 'PATCH');
    await activity.click();
    expect((await saved).status()).toBe(200);

    await page.reload();
    await page.getByRole('button', { name: 'Edit profile' }).click();
    await expect(page.getByRole('switch', { name: 'Activity' })).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('switch', { name: 'Match history' })).toHaveAttribute('aria-checked', 'true');
  });

  test('deleting the account signs out, and logging in again cancels it', async ({ page }) => {
    const user = newUser();
    await page.goto('/');
    await registerViaApi(page, user);
    const userId = await userIdByUsername(user.username);
    await page.goto(`/profile/${user.username}`);
    await page.getByRole('button', { name: 'Edit profile' }).click();
    await page.getByRole('button', { name: 'Delete account' }).click();
    await page.getByPlaceholder('Your current password').fill(user.password);
    await page.getByRole('button', { name: 'Delete in 15 days' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expectLoggedOut(page);
    expect(await deletionRequested(userId)).toBe(true);

    await loginViaUi(page, user, false);
    expect(await deletionRequested(userId)).toBe(false);
  });
});
