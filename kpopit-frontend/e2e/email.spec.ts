import { test, expect, ipHeader } from './support/fixtures';
import { loginViaUi, newUser, registerViaApi } from './support/accounts';
import { appPath, emailsTo, latestLink } from './support/outbox';

// Every flow reads the real email from the backend outbox (EMAIL_DELIVERY=outbox): no Resend call.

async function accessToken(page: import('@playwright/test').Page, identifier: string, password: string) {
  const res = await page.request.post('/api/auth/login', { headers: ipHeader(), data: { identifier, password } });
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()).access_token as string;
}

test.describe('Email flows (outbox)', () => {
  test('verify email from the emailed link', async ({ page }) => {
    const user = newUser();
    await page.goto('/');
    await registerViaApi(page, user, true);
    const jwt = await accessToken(page, user.username, user.password);
    const before = emailsTo(user.email).length;

    const res = await page.request.post('/api/auth/email/send-verification-email', {
      headers: { ...ipHeader(), Authorization: `Bearer ${jwt}` },
    });
    expect(res.status(), await res.text()).toBe(200);

    const link = await latestLink(user.email, before);
    expect(link).toContain('/verify-email?token=');
    await page.goto(appPath(link));
    await expect(page.getByText('Your email has been verified.')).toBeVisible();

    const me = await page.request.get('/api/auth/me', { headers: { ...ipHeader(), Authorization: `Bearer ${jwt}` } });
    expect((await me.json()).profile.email_verified).toBe(true);
  });

  test('forgot + reset password from the emailed link', async ({ page }) => {
    const user = newUser();
    await page.goto('/');
    await registerViaApi(page, user, true);
    await page.context().clearCookies();
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    const before = emailsTo(user.email).length;

    await page.goto('/forgot-password');
    await page.getByPlaceholder('bias@example.com').fill(user.email);
    await page.getByRole('button', { name: 'Send Reset Link' }).click();
    await expect(page.getByText('If an account with that email exists, a reset link has been sent.')).toBeVisible();

    const link = await latestLink(user.email, before);
    expect(link).toContain('/reset-password?token=');
    await page.goto(appPath(link));
    const pw = page.getByPlaceholder('••••••••••••');
    const newPassword = 'N3w-Passw0rd!';
    await pw.nth(0).fill(newPassword);
    await pw.nth(1).fill(newPassword);
    await page.getByRole('button', { name: 'Reset Password' }).click();
    await expect(page.getByText('Password reset successfully.')).toBeVisible();

    await loginViaUi(page, { ...user, password: newPassword }, false);
  });

  test('email change: confirm from the new address, revert from the old one', async ({ page }) => {
    const user = newUser();
    const newEmail = user.email.replace('@', '_new@');
    await page.goto('/');
    await registerViaApi(page, user, true);
    const jwt = await accessToken(page, user.username, user.password);
    const auth = { ...ipHeader(), Authorization: `Bearer ${jwt}` };
    const sentToNew = emailsTo(newEmail).length;
    const sentToOld = emailsTo(user.email).length;

    const req = await page.request.patch('/api/auth/email/request-email-change', {
      headers: auth,
      data: { new_email: newEmail, current_password: user.password },
    });
    expect(req.status(), await req.text()).toBe(200);

    const confirmLink = await latestLink(newEmail, sentToNew);
    expect(confirmLink).toContain('/confirm-email-change?token=');
    await page.goto(appPath(confirmLink));
    await expect(page.getByText('Your email has been changed')).toBeVisible();
    const changed = await page.request.get('/api/auth/me', { headers: auth });
    expect((await changed.json()).user_credentials.email).toBe(newEmail);

    // The old address gets the revert link; the new one a plain confirmation.
    const revertLink = await latestLink(user.email, sentToOld);
    expect(revertLink).toContain('/revert-email-change?token=');
    await page.goto(appPath(revertLink));
    await expect(page.getByText('Your email has been restored to the original address.')).toBeVisible();

    const fresh = await accessToken(page, user.username, user.password);
    const me = await page.request.get('/api/auth/me', { headers: { ...ipHeader(), Authorization: `Bearer ${fresh}` } });
    expect((await me.json()).user_credentials.email).toBe(user.email);
  });
});
