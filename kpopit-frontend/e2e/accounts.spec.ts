import { test, expect, ipHeader } from './support/fixtures';
import {
  expectLoggedIn, expectLoggedOut, loginViaUi, newUser, registerViaApi, registerViaUi,
} from './support/accounts';
import { answerIdol, guessIdol, openGame, userToken, victoryMarker } from './support/game';
import {
  dailyHistory, issuePasswordResetToken, setUsernameChangedAt, userIdByToken, userIdByUsername,
} from './support/db';

const editUsernameButton = (page: import('@playwright/test').Page) =>
  page.locator('label').getByText('Username', { exact: true }).locator('xpath=..').getByRole('button', { name: 'Edit', exact: true });

test.describe('Accounts', () => {
  test('register through the form logs the user in', async ({ page }) => {
    const user = newUser();
    await registerViaUi(page, user);
    expect(await userIdByUsername(user.username)).toBeGreaterThan(0);
    expect(await page.evaluate(() => localStorage.getItem('kpopit_session'))).toBe('true');
  });

  test('register rejects mismatched passwords', async ({ page }) => {
    const user = newUser();
    await page.goto('/register');
    await page.getByPlaceholder('Pick your stage name').fill(user.username);
    const pw = page.getByPlaceholder('••••••••••••');
    await pw.nth(0).fill(user.password);
    await pw.nth(1).fill(`${user.password}x`);
    await page.getByRole('button', { name: 'Join KpopIt' }).click();
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('register with a taken username shows one error', async ({ page }) => {
    // Known bug, older than the stack update: the live "already taken" hint stays up and the
    // submit error is added below it. Remove test.fail once the page shows one message.
    test.fail();
    const user = newUser();
    await page.goto('/');
    await registerViaApi(page, user);
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    await page.goto('/register');
    await page.getByPlaceholder('Pick your stage name').fill(user.username);
    const pw = page.getByPlaceholder('••••••••••••');
    await pw.nth(0).fill(user.password);
    await pw.nth(1).fill(user.password);
    // Like a real user: the live check has answered before the click.
    await expect(page.getByText('Username already taken')).toBeVisible();
    await page.getByRole('button', { name: 'Join KpopIt' }).click();
    await expect(page.getByText('Username is already taken')).toBeVisible();
    await expect(page.getByText(/already taken/i)).toHaveCount(1, { timeout: 3_000 });
  });

  test('login without "remember me" keeps the session for the tab only', async ({ page, context }) => {
    const user = newUser();
    await page.goto('/');
    await registerViaApi(page, user);
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    await loginViaUi(page, user, false);
    expect(await page.evaluate(() => [localStorage.getItem('kpopit_session'), sessionStorage.getItem('kpopit_session')]))
      .toEqual([null, 'true']);

    await page.reload();
    await expectLoggedIn(page);

    const other = await context.newPage();
    await other.goto('/');
    await expectLoggedOut(other);
  });

  test('login with "remember me" restores the session in a new tab and after reload @smoke', async ({ page, context }) => {
    const user = newUser();
    await page.goto('/');
    await registerViaApi(page, user);
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    await loginViaUi(page, user, true);
    expect(await page.evaluate(() => localStorage.getItem('kpopit_session'))).toBe('true');

    const refresh = page.waitForResponse((r) => r.url().includes('/api/auth/refresh') && r.status() === 200);
    await page.reload();
    await refresh;
    await expectLoggedIn(page);

    const other = await context.newPage();
    await other.goto('/');
    await expectLoggedIn(other);
  });

  test('login rejects a wrong password', async ({ page }) => {
    const user = newUser();
    await page.goto('/');
    await registerViaApi(page, user);
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    await page.getByPlaceholder('@username or email').fill(user.username);
    await page.getByPlaceholder('••••••••••••').fill('wrong-password-123');
    await page.getByRole('button', { name: 'Login to KpopIt' }).click();
    await expect(page.getByText('Invalid username, email or password')).toBeVisible();
  });

  test('logout clears the session', async ({ page }) => {
    const user = newUser();
    await page.goto('/');
    await registerViaApi(page, user);
    await page.reload();
    await expectLoggedIn(page);

    await page.locator('nav').getByRole('button', { name: 'User menu' }).first().click();
    await page.getByRole('button', { name: 'Logout' }).click();
    await expectLoggedOut(page);
    expect(await page.evaluate(() => [localStorage.getItem('kpopit_session'), localStorage.getItem('userToken')]))
      .toEqual([null, null]);
    await page.reload();
    await expectLoggedOut(page);
  });

  test('an expired access token is refreshed and the request replayed', async ({ page }) => {
    const user = newUser();
    await page.goto('/');
    await registerViaApi(page, user);

    // First /auth/me answers 401 (as with an expired JWT); the interceptor must refresh and retry.
    let failed = false;
    await page.route('**/api/auth/me', async (route) => {
      if (!failed) {
        failed = true;
        await route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"Token expired"}' });
      } else {
        await route.continue();
      }
    });
    const meOk = page.waitForResponse((r) => r.url().includes('/api/auth/me') && r.status() === 200);
    await page.reload();
    await meOk;
    expect(failed).toBe(true);
    await expectLoggedIn(page);
  });

  test('claim keeps the anonymous history when creating an account', async ({ page }) => {
    await openGame(page, 'classic');
    await guessIdol(page, 'classic', await answerIdol(page, 'classic'));
    await expect(victoryMarker(page, 'classic')).toBeVisible({ timeout: 45_000 });
    const anonId = await userIdByToken(await userToken(page));

    const user = newUser();
    const claim = page.waitForResponse((r) => r.url().includes('/api/auth/claim'));
    await registerViaUi(page, user);
    expect((await claim).status()).toBeLessThan(300);

    expect(await userIdByUsername(user.username)).toBe(anonId);
    expect(await dailyHistory(anonId, 'classic')).toEqual([expect.objectContaining({ won: true, guesses_count: 1 })]);
    await openGame(page, 'classic');
    await expect(victoryMarker(page, 'classic')).toBeVisible();
  });

  test('forgot + reset password (email stubbed)', async ({ page }) => {
    const user = newUser();
    await page.goto('/');
    await registerViaApi(page, user, true);
    await page.context().clearCookies();
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

    await page.goto('/forgot-password');
    await page.getByPlaceholder('bias@example.com').fill(user.email);
    await page.getByRole('button', { name: 'Send Reset Link' }).click();
    await expect(page.getByText('If an account with that email exists, a reset link has been sent.')).toBeVisible();

    // The email is never sent in tests: issue the token the email would carry.
    const token = await issuePasswordResetToken(await userIdByUsername(user.username));
    await page.goto(`/reset-password?token=${token}`);
    const pw = page.getByPlaceholder('••••••••••••');
    const newPassword = 'N3w-Passw0rd!';
    await pw.nth(0).fill(newPassword);
    await pw.nth(1).fill(newPassword);
    await page.getByRole('button', { name: 'Reset Password' }).click();
    await expect(page.getByText('Password reset successfully.')).toBeVisible();

    await loginViaUi(page, { ...user, password: newPassword }, false);
  });

  test('profile page and username change cooldown', async ({ page }) => {
    const user = newUser();
    await page.goto('/');
    await registerViaApi(page, user);
    await page.goto(`/profile/${user.username}`);
    await expect(page.getByRole('complementary', { name: 'Identity' }).getByText(`@${user.username}`, { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Edit Profile' }).click();
    await editUsernameButton(page).click();
    const renamed = `${user.username.slice(0, 10)}rn`;
    await page.getByPlaceholder('@your-new-handle').fill(renamed);
    await page.getByPlaceholder('Your current password').fill(user.password);
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByPlaceholder('@your-new-handle')).toBeHidden();
    await expect(page.getByText(`@${renamed}`).filter({ visible: true }).first()).toBeVisible();
    const userId = await userIdByUsername(renamed);

    await editUsernameButton(page).click();
    await expect(page.getByText('Next change in 5 days')).toBeVisible();
    await expect(page.getByPlaceholder('@your-new-handle')).toBeDisabled();

    // The API enforces the same cooldown and lifts it after 5 days.
    const login = await page.request.post('/api/auth/login', { headers: ipHeader(), data: { identifier: renamed, password: user.password } });
    const jwt = (await login.json()).access_token;
    const again = await page.request.patch('/api/user/profile', {
      headers: { ...ipHeader(), Authorization: `Bearer ${jwt}` },
      data: { username: `${renamed.slice(0, 10)}x2`, current_password: user.password },
    });
    expect(again.status()).toBe(400);
    expect((await again.json()).error).toMatch(/once every 5 days/);

    await setUsernameChangedAt(userId, 6);
    const later = await page.request.patch('/api/user/profile', {
      headers: { ...ipHeader(), Authorization: `Bearer ${jwt}` },
      data: { username: `${renamed.slice(0, 10)}x2`, current_password: user.password },
    });
    expect(later.status()).toBe(200);
  });
});
