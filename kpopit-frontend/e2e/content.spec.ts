import { test, expect } from './support/fixtures';

const noHorizontalScroll = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

test.describe('content pages @mobile', () => {
  test('blog: filters by tag in the URL and opens a post', async ({ page, consoleErrors }) => {
    await page.goto('/blog');
    await expect(page.getByRole('heading', { name: 'Blog', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: /^Dev log/ }).click();
    await expect(page).toHaveURL(/\?tag=dev-log$/);
    await expect(page.getByText('No posts here yet.')).toBeVisible();
    await page.getByRole('button', { name: /^All posts/ }).click();
    await expect(page).toHaveURL(/\/blog$/);
    await page.getByRole('link', { name: /Read the post/ }).first().click();
    await expect(page).toHaveURL(/\/blog\/[\w-]+$/);
    await expect(page.locator('.post-body h2').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'All posts' })).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    expect(consoleErrors.list).toEqual([]);
  });

  test('an unknown post is the 404', async ({ page }) => {
    await page.goto('/blog/not-a-post');
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  });

  test('changelog: the type filter lives in ?type=', async ({ page }) => {
    await page.goto('/changelog?type=change');
    await expect(page.getByRole('button', { name: /Changes/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: 'Database changed to PostgreSQL' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'New feature: Accounts' })).toHaveCount(0);
    await page.getByRole('button', { name: /^All/ }).click();
    await expect(page).toHaveURL(/\/changelog$/);
    await expect(page.getByRole('heading', { name: 'New feature: Accounts' })).toBeVisible();
  });

  test('how to play: mode tabs in ?mode=, the countdown and the demos', async ({ page }) => {
    await page.goto('/how-to-play?mode=pixelated');
    await expect(page.getByRole('tab', { name: 'Pixelated' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel('Time left')).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
    const artist = page.getByRole('button', { name: 'Artist hint, locked' });
    await expect(artist).toBeDisabled();
    for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'One more wrong guess' }).click();
    await expect(page.getByRole('button', { name: 'Artist hint' })).toBeEnabled();

    await page.getByRole('tab', { name: 'Classic' }).click();
    await expect(page).toHaveURL(/\/how-to-play$/);
    await page.getByRole('button', { name: 'Guess Kim Chaewon' }).click();
    await expect(page.getByText("All green. That's today's idol!")).toBeVisible();
    await expect(page.getByRole('link', { name: 'Play Classic' })).toHaveAttribute('href', '/classic');
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  test('about: the index jumps to a section', async ({ page, isMobile }) => {
    await page.goto('/about');
    const index = isMobile ? page.getByRole('button', { name: /Contact/ }) : page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: /Contact/ });
    await index.click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(page.getByRole('heading', { name: /06 · CONTACT/ })).toBeInViewport();
  });

  test('contact: send stays disabled until there is a message and builds the mailto', async ({ page }) => {
    await page.goto('/contact');
    const send = page.getByRole('button', { name: 'Send message' });
    await expect(send).toBeDisabled();
    await page.getByRole('button', { name: 'Wrong idol data' }).click();
    await page.getByPlaceholder('Idol name and group').fill('Karina (aespa)');
    await page.getByLabel('Message').fill('Height is wrong');
    await expect(send).toBeEnabled();
    await send.click();
    await expect(page.getByRole('status').filter({ hasText: 'Opening your email app...' })).toBeVisible();
  });

  test('faq: search opens every match; FAQPage JSON-LD is here, not on home', async ({ page }) => {
    await page.goto('/faq');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Search questions').fill('account');
    await expect(page.getByRole('button', { name: 'Do I need an account?' })).toHaveAttribute('aria-expanded', 'true');
    await page.getByLabel('Search questions').fill('zzzz');
    await expect(page.getByText('No matches...')).toBeVisible();
    const types = async () => page.locator('script[type="application/ld+json"]').evaluateAll((s) => s.map((n) => JSON.parse(n.textContent ?? '{}')['@type']));
    await page.reload();
    expect(await types()).toContain('FAQPage');
    await page.goto('/');
    expect(await types()).not.toContain('FAQPage');
  });

  test('privacy policy: the index follows the reading position', async ({ page, isMobile }) => {
    await page.goto('/privacy-policy');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('article').getByText(/Last updated/)).toBeVisible();
    await page.evaluate(() => document.getElementById('see')!.scrollIntoView({ block: 'start' }));
    const current = (label: string) => isMobile ? page.locator('button[aria-pressed="true"]', { hasText: label }) : page.locator('a[aria-current="location"]', { hasText: label });
    await expect(current('Who can see it')).toHaveCount(1);
    // At the end of the page the reading line has slid down: the last section is current.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(current('Changes and contact')).toHaveCount(1);
    expect(await noHorizontalScroll(page)).toBe(true);
  });
});
