import { test, expect } from './support/fixtures';
import { expectLoggedIn, newUser, registerViaApi } from './support/accounts';
import { makeAdmin, userIdByUsername } from './support/db';
import { ADMIN_ROUTE } from './support/env';

test.describe('Admin page', () => {
  test('an anonymous visitor is sent home', async ({ page }) => {
    await page.goto(ADMIN_ROUTE);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Add New Idol')).toHaveCount(0);
  });

  test('a normal user is sent home', async ({ page }) => {
    const user = newUser();
    await page.goto('/');
    await registerViaApi(page, user);
    await page.reload();
    await expectLoggedIn(page);

    await page.goto(ADMIN_ROUTE);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Add New Idol')).toHaveCount(0);
  });

  test('an admin sees the page', async ({ page }) => {
    const user = newUser();
    await page.goto('/');
    await registerViaApi(page, user);
    await makeAdmin(await userIdByUsername(user.username));

    // The session restore refreshes the JWT, which now carries is_admin.
    await page.goto(ADMIN_ROUTE);
    await expect(page.getByText('Add New Idol')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${ADMIN_ROUTE}$`));
  });
});
