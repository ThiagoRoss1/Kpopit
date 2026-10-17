import { test, expect, type Page } from './support/fixtures';
import { closeModal, searchInput } from './support/game';

// Each backend-dependent section loads and fails on its own; the page shell (navbar, title,
// buttons) never waits for it, and nothing reloads the document.

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

test.describe('sections load on their own', () => {
  test('a slow game API shows the shell at once and keeps the layout', async ({ page }) => {
    await trackShifts(page);
    await holdApi(page, '/game/classic/daily-idol', 2_500);
    await page.goto('/classic');
    await expect(classicTitle(page)).toBeVisible({ timeout: 2_000 });
    await expect(page.getByRole('img', { name: 'Stats' }).first()).toBeVisible();
    await expect(page.locator('[aria-busy="true"][aria-label="Loading"]').first()).toBeVisible();
    const search = page.getByRole('textbox').first();
    await expect(search).toBeDisabled();
    const before = await search.boundingBox();
    await expect(searchInput(page, 'classic')).toBeEnabled({ timeout: 20_000 });
    const after = await searchInput(page, 'classic').boundingBox();
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(2);
    expect(await cls(page)).toBeLessThan(0.1);
  });

  test('a failing game API shows Retry there; the rest of the page works', async ({ page }) => {
    await failApi(page, '/game/classic/daily-idol');
    await page.goto('/classic');
    const alert = page.getByRole('alert');
    await expect(alert).toContainText("Couldn't load this part.", { timeout: 20_000 });
    await expect(classicTitle(page)).toBeVisible();
    await page.getByRole('img', { name: 'Stats' }).first().click();
    await closeModal(page, 'Stats...');

    await page.unroute('**/api/game/classic/daily-idol*');
    await alert.getByRole('button', { name: 'Retry' }).click();
    await expect(searchInput(page, 'classic')).toBeEnabled({ timeout: 20_000 });
  });

  test('a failing idol list shows Retry in the search; the game area still loads', async ({ page }) => {
    await failApi(page, '/idols-list');
    await page.goto('/classic');
    await expect(page.getByRole('alert')).toContainText("Couldn't load the idol list.", { timeout: 20_000 });
    await expect(page.getByText(/Hints grid will be unlocked|Guess any idol to start/).first()).toBeVisible();

    await page.unroute('**/api/idols-list*');
    await page.getByRole('alert').getByRole('button', { name: 'Retry' }).click();
    await expect(searchInput(page, 'classic')).toBeEnabled({ timeout: 20_000 });
  });

  test('a failing album list shows Retry in the Pixelated search', async ({ page }) => {
    await failApi(page, '/game/pixelated/albums-list');
    await page.goto('/pixelated');
    await expect(page.getByRole('alert')).toContainText("Couldn't load the album list.", { timeout: 20_000 });
    await expect(page.getByText('Guess the album')).toBeVisible();
  });

  test('a failing idols list keeps the navbar and shows Retry in the grid', async ({ page }) => {
    await page.goto('/');
    await failApi(page, '/idols-page');
    await page.locator('nav').getByRole('button', { name: 'Idols' }).click();
    await page.locator('nav').getByRole('link', { name: 'All Idols' }).click();
    await expect(page).toHaveURL(/\/idols$/);
    await expect(page.getByRole('alert')).toContainText("Couldn't load this part.", { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Kpopit Idols' })).toBeVisible();
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
    // The countdown ends one second after it starts.
    await page.route('**/api/reset-timer*', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ total_seconds: 1, hours: 0, minutes: 0, seconds: 1, next_reset: '' }),
    }));
    let dailyCalls = 0;
    page.on('request', (r) => { if (r.url().includes('/api/game/classic/daily-idol')) dailyCalls += 1; });
    const counter = countLoads(page);
    await page.goto('/classic');
    await expect(searchInput(page, 'classic')).toBeEnabled({ timeout: 20_000 });
    const before = dailyCalls;
    // The How to Play modal runs the timer; at zero the page remounts on a new day key (which also
    // closes the modal) and fetches the daily data again.
    await page.getByRole('button', { name: 'How to Play' }).click();
    await expect.poll(() => dailyCalls, { timeout: 15_000 }).toBeGreaterThan(before);
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
