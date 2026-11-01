import { test, expect } from './support/fixtures';

// The theme the page painted with: read on the first animation frame, before React hydrates.
const recordFirstPaintTheme = () => {
  requestAnimationFrame(() => {
    (window as unknown as { __firstTheme?: string }).__firstTheme = document.documentElement.dataset.theme ?? 'day';
  });
};
const firstPaintTheme = (page: import('@playwright/test').Page) =>
  page.waitForFunction(() => (window as unknown as { __firstTheme?: string }).__firstTheme).then((h) => h.jsonValue());

test.describe('NavBar @mobile', () => {
  test('a new page follows the saved theme; an old page keeps the navbar at night', async ({ page }) => {
    await page.goto('/about');
    const nav = page.locator('nav');
    const toggle = nav.getByRole('button', { name: 'Switch day and night' });
    await expect(toggle).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'night');

    await page.goto('/classic');
    // Old pages: forced night, the toggle hidden but still taking its space.
    await expect(page.locator('[data-theme="night"]').filter({ has: page.locator('nav') })).toHaveCount(1);
    const hidden = page.locator('nav button[aria-label="Switch day and night"]');
    await expect(hidden).toBeHidden();
    const box = await hidden.boundingBox();
    expect(box?.width ?? (await hidden.evaluate((el) => el.getBoundingClientRect().width))).toBeGreaterThan(30);
  });

  test('the theme persists across a reload without a Day flash', async ({ page }) => {
    await page.addInitScript(recordFirstPaintTheme);
    await page.goto('/faq');
    expect(await firstPaintTheme(page)).toBe('day');
    await page.locator('nav').getByRole('button', { name: 'Switch day and night' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');

    await page.reload();
    expect(await firstPaintTheme(page)).toBe('night');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  });

  test('desktop dropdowns mark the current page and close on Escape', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop dropdowns');
    await page.goto('/changelog');
    const nav = page.locator('nav');
    const about = nav.getByRole('button', { name: 'About', exact: true });
    await expect(about).toHaveAttribute('data-st', 'cur');
    await about.click();
    await expect(nav.getByRole('menu')).toBeVisible();
    await expect(nav.getByRole('menuitem', { name: /InkIt/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(nav.getByRole('menu')).toHaveCount(0);

    await nav.getByRole('button', { name: 'Games', exact: true }).click();
    // InkIt is listed as coming soon, not linked.
    await expect(nav.getByRole('menuitem', { name: /InkIt/ })).toHaveAttribute('aria-disabled', 'true');
    await nav.getByRole('menuitem', { name: 'Blurry' }).click();
    await expect(page).toHaveURL(/\/blurry$/);
    await expect(nav.getByRole('menu')).toHaveCount(0);
  });

  test('the mobile sheet opens the current section and navigates', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile sheet');
    await page.goto('/how-to-play');
    const nav = page.locator('nav');
    await nav.getByRole('button', { name: 'Open menu' }).click();
    await expect(nav.getByRole('button', { name: 'About' })).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.getByRole('button', { name: 'Games' })).toHaveAttribute('aria-expanded', 'false');
    await nav.getByRole('button', { name: 'Idols' }).click();
    await nav.getByRole('link', { name: 'All idols' }).click();
    await expect(page).toHaveURL(/\/idols$/);
    await expect(nav.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');
  });

  test('a disabled feature has no link and its route is the 404', async ({ page, isMobile }) => {
    // The E2E backend runs with CALENDAR_ENABLED and IDOL_XP_ENABLED off.
    const features = await (await page.request.get('/api/features')).json();
    expect(features.calendar).toBe(false);
    await page.goto('/about');
    const nav = page.locator('nav');
    if (isMobile) await nav.getByRole('button', { name: 'Open menu' }).click();
    await expect(nav.getByRole('link', { name: 'Calendar' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Collections' })).toHaveCount(1);

    for (const path of ['/calendar', '/idol-xp']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    }
  });
});
