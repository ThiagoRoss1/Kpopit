import { test, expect } from './support/fixtures';

test.describe('albums @mobile', () => {
  test('the list filters in the URL and a card opens its album page', async ({ page, consoleErrors, isMobile }) => {
    await page.goto('/albums');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Albums', level: 1 })).toBeVisible();
    const total = await page.locator('a[href^="/albums/"]').count();
    expect(total).toBeGreaterThan(0);

    if (isMobile) await page.getByRole('button', { name: /Show filters/ }).click();
    await page.getByRole('button', { name: 'Language' }).click();
    await page.getByRole('menuitemradio', { name: /Korean/ }).click();
    await expect(page).toHaveURL(/lang=Korean/);
    if (isMobile) await page.getByRole('button', { name: /Hide filters/ }).click();
    await expect(page.getByRole('button', { name: 'Remove Korean' })).toBeVisible();

    await page.getByLabel('Search albums or artists').fill('zzzz-no-such-album');
    await expect(page.getByText('No albums found...')).toBeVisible();
    await page.getByRole('button', { name: 'Clear search & filters' }).click();
    await expect(page).toHaveURL(/\/albums$/);

    const first = page.locator('a[href^="/albums/"]').first();
    await first.scrollIntoViewIfNeeded();
    const href = await first.getAttribute('href');
    await first.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('RELEASED')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to all albums' })).toBeVisible();
    expect(consoleErrors.list).toEqual([]);
  });

  test('a wrong slug goes to the canonical one and an unknown album is the 404', async ({ page, request }) => {
    const [album] = await (await request.get('/api/albums-page')).json();
    await page.goto(`/albums/${album.id}/old-name`);
    await expect(page).not.toHaveURL(/old-name$/);
    await page.goto('/albums/99999999/nope');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });
});
