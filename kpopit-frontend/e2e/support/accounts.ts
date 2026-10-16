import { expect, type Page } from '@playwright/test';
import { ipHeader } from './fixtures';

export type TestUser = { username: string; email: string; password: string };

let seq = 0;

// Usernames are capped at 12 characters: `e2e` + 9.
export function newUser(): TestUser {
  seq += 1;
  const stamp = (Date.now().toString(36) + seq.toString(36)).slice(-9);
  return {
    username: `e2e${stamp}`,
    email: `e2e_${stamp}@example.com`,
    password: 'E2e-Passw0rd!',
  };
}

// page.request shares the browser's cookie jar, so the refresh cookie reaches the page;
// the markers make AuthProvider restore the session on the next load.
export async function registerViaApi(page: Page, user: TestUser, withEmail = false): Promise<void> {
  const res = await page.request.post('/api/auth/register', {
    headers: ipHeader(),
    data: { username: user.username, password: user.password, ...(withEmail ? { email: user.email } : {}) },
  });
  expect(res.status(), await res.text()).toBe(201);
  await page.evaluate(() => {
    localStorage.setItem('kpopit_session', 'true');
    localStorage.setItem('kpopit_was_authenticated', 'true');
  });
}

export async function registerViaUi(page: Page, user: TestUser, withEmail = false): Promise<void> {
  await page.goto('/register');
  await page.getByPlaceholder('Pick your stage name').fill(user.username);
  if (withEmail) await page.getByPlaceholder('bias@example.com').fill(user.email);
  const pw = page.getByPlaceholder('••••••••••••');
  await pw.nth(0).fill(user.password);
  await pw.nth(1).fill(user.password);
  await page.getByRole('button', { name: 'Join KpopIt' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
  await expectLoggedIn(page);
}

export async function loginViaUi(page: Page, user: TestUser, rememberMe: boolean): Promise<void> {
  await page.goto('/login');
  await page.getByPlaceholder('@username or email').fill(user.username);
  await page.getByPlaceholder('••••••••••••').fill(user.password);
  if (rememberMe) await page.getByText('Remember me', { exact: true }).click();
  await page.getByRole('button', { name: 'Login to KpopIt' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
  await expectLoggedIn(page);
}

// The NavBar swaps its "Login" link for the user menu once authenticated.
export async function expectLoggedIn(page: Page): Promise<void> {
  await expect(page.locator('nav').getByRole('link', { name: 'Login', exact: true })).toHaveCount(0, { timeout: 20_000 });
}

export async function expectLoggedOut(page: Page): Promise<void> {
  await expect(page.locator('nav').getByRole('link', { name: 'Login', exact: true }).first()).toBeVisible({ timeout: 20_000 });
}
