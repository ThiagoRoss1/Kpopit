import { test, expect, type Page } from './support/fixtures';
import { searchInput } from './support/game';

// Game pages show one loader below the navbar until their data is in (Retry on error), and a
// day change never reloads the document.

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function holdApi(page: Page, path: string, ms: number) {
  await page.route(`**/api${path}*`, async (route) => {
    await delay(ms);
    await route.fallback();
  });
}

async function failApi(page: Page, path: string) {
  await page.route(`**/api${path}*`, (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"test"}' }));
}

// Counts document requests of the main frame: a reload is a second one. (Not 'load' events:
// Firefox also fires one for the initial about:blank.)
function countLoads(page: Page): { loads: number } {
  const counter = { loads: 0 };
  page.on('request', (r) => {
    if (r.isNavigationRequest() && r.frame() === page.mainFrame()) counter.loads += 1;
  });
  return counter;
}

async function trackShifts(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

const cls = (page: Page) => page.evaluate(() => (window as unknown as { __cls: number }).__cls);
const classicTitle = (page: Page) => page.getByRole('heading', { name: /Kpop\s*it/i }).first();

test.describe('page loading', () => {
  test('a slow game API shows the navbar and one loader, then the whole game', async ({ page }) => {
    await trackShifts(page);
    await holdApi(page, '/game/classic/daily-idol', 2_500);
    await page.goto('/classic');
    await expect(page.getByRole('status')).toHaveText('Loading Kpopit...', { timeout: 2_000 });
    await expect(page.locator('nav').getByRole('link', { name: 'Contact' })).toBeVisible();
    await expect(searchInput(page, 'classic')).toBeHidden();
    await expect(searchInput(page, 'classic')).toBeEnabled({ timeout: 20_000 });
    await expect(classicTitle(page)).toBeVisible();
    await expect(page.getByRole('status')).toBeHidden();
    expect(await cls(page)).toBeLessThan(0.1);
  });

  test('a failing game API shows the error with Retry; the navbar keeps working', async ({ page }) => {
    await failApi(page, '/game/classic/daily-idol');
    await page.goto('/classic');
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('Error loading Kpopit.', { timeout: 20_000 });
    await expect(page.locator('nav').getByRole('link', { name: 'Contact' })).toBeVisible();

    await page.unroute('**/api/game/classic/daily-idol*');
    await alert.getByRole('button', { name: 'Retry' }).click();
    await expect(searchInput(page, 'classic')).toBeEnabled({ timeout: 20_000 });
  });

  test('a failing idol list shows the error with Retry and recovers', async ({ page }) => {
    await failApi(page, '/idols-list');
    await page.goto('/classic');
    await expect(page.getByRole('alert')).toContainText('Error loading Kpopit.', { timeout: 20_000 });

    await page.unroute('**/api/idols-list*');
    await page.getByRole('alert').getByRole('button', { name: 'Retry' }).click();
    await expect(searchInput(page, 'classic')).toBeEnabled({ timeout: 20_000 });
  });

  test('a failing album list shows the error with Retry on Pixelated', async ({ page }) => {
    await failApi(page, '/game/pixelated/albums-list');
    await page.goto('/pixelated');
    await expect(page.getByRole('alert')).toContainText('Error loading Kpopit.', { timeout: 20_000 });
    await expect(page.getByRole('alert').getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('a failing idols list on a client navigation keeps the navbar and offers Retry', async ({ page }) => {
    await page.goto('/');
    await failApi(page, '/idols-page');
    await page.locator('nav').getByRole('button', { name: 'Idols' }).click();
    await page.locator('nav').getByRole('link', { name: 'All Idols' }).click();
    await expect(page).toHaveURL(/\/idols$/);
    await expect(page.getByRole('alert')).toContainText('Error fetching idols data.', { timeout: 20_000 });
    await expect(page.locator('nav').getByRole('link', { name: 'Contact' })).toBeVisible();
  });
});

test.describe('no full page reload', () => {
  test('a first visit plays without reloading @smoke', async ({ page }) => {
    const counter = countLoads(page);
    await page.goto('/classic');
    await expect(searchInput(page, 'classic')).toBeEnabled({ timeout: 20_000 });
    await delay(1_500);
    expect(counter.loads).toBe(1);
    expect(await page.evaluate(() => localStorage.getItem('gameDate'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("a stored older day is cleared without reloading @smoke", async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('gameDate', '2000-01-01');
      localStorage.setItem('todayGuessesDetails', '[{"stale":true}]');
      localStorage.setItem('gameComplete', 'true');
    });
    const counter = countLoads(page);
    await page.goto('/classic');
    await expect(searchInput(page, 'classic')).toBeEnabled({ timeout: 20_000 });
    expect(counter.loads).toBe(1);
    expect(await page.evaluate(() => localStorage.getItem('gameDate'))).not.toBe('2000-01-01');
    expect(await page.evaluate(() => localStorage.getItem('todayGuessesDetails'))).toBeNull();
  });

  test('the midnight timer swaps the day without reloading', async ({ page }) => {
    // Midnight is one minute away; the test moves the page's clock past it.
    await page.clock.install();
    await page.route('**/api/reset-timer*', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ total_seconds: 60, hours: 0, minutes: 1, seconds: 0, next_reset: '' }),
    }));
    const counter = countLoads(page);
    await page.goto('/classic');
    await expect(searchInput(page, 'classic')).toBeEnabled({ timeout: 20_000 });
    await page.getByRole('button', { name: 'How to Play' }).click();
    await expect(page.getByRole('heading', { name: 'How to Play...', exact: true })).toBeVisible();

    // After midnight the server reports the next day.
    const tomorrow = '2099-01-01';
    await page.route('**/api/game/classic/daily-idol*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, json: { ...(await response.json()), server_date: tomorrow } });
    });
    await page.clock.fastForward('01:05');
    // At zero the data is refetched and the new date remounts the page on its day (closing the modal).
    await page.waitForFunction((day) => localStorage.getItem('gameDate') === day, tomorrow, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'How to Play...', exact: true })).toBeHidden();
    await expect(searchInput(page, 'classic')).toBeEnabled({ timeout: 20_000 });
    expect(counter.loads).toBe(1);
  });
});

test.describe('footer pages stay light', () => {
  for (const path of ['/privacy-policy', '/contact', '/idols']) {
    test(`${path} creates no anonymous token and loads no idol search list`, async ({ page }) => {
      const calls: string[] = [];
      page.on('request', (r) => {
        if (/\/api\/(user\/init|idols-list)/.test(r.url())) calls.push(r.url());
      });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await delay(1_000);
      expect(calls).toEqual([]);
    });
  }
});
