import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from './support/fixtures';
import { LocalServer } from './support/tomorrow';
import { buildIdolSlug } from '../src/utils/formatters';

// The idols pages navigate like the game pages: data is prefetched on intent, a navigation waits up
// to 200 ms for it, a slower one shows the loader (>= 500 ms) at once, and no frame is ever blank.
// Runs on the production build: the prerendered .data files and the SPA fallback only exist there.
const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW = 'http://127.0.0.1:4173';

type IdolRow = { id: number; artist_name: string; group_name: string | null };
type Frame = {
  t: number; path: string; y: number; loader: boolean; blank: boolean; nav: boolean;
  cards: boolean; profile: string | null; animating: boolean; pending: boolean;
};

// Every animation frame: what the page shows. Installed before any page script runs, and kept cheap
// (existence checks, no counting) so it doesn't slow the frames it measures.
function monitor() {
  const w = window as unknown as { __frames: Frame[]; __cls: number; __clickAt: number | null };
  w.__frames = [];
  w.__cls = 0;
  w.__clickAt = null;
  new PerformanceObserver((list) => {
    for (const e of list.getEntries() as PerformanceEntry[] & { value: number; hadRecentInput: boolean }[]) {
      if (!e.hadRecentInput) w.__cls += e.value;
    }
  }).observe({ type: 'layout-shift', buffered: true });
  document.addEventListener('click', () => { w.__clickAt = performance.now(); }, true);
  const tick = () => {
    const main = document.querySelector('main');
    const loader = !!document.querySelector('[role=status], [role=alert]');
    const photo = main?.querySelector<HTMLImageElement>('img[alt$=" photo"]');
    w.__frames.push({
      t: performance.now(),
      path: location.pathname,
      y: Math.round(scrollY),
      loader,
      // Nothing to look at: no loader and no content (the SPA fallback shell has its loader).
      blank: !loader && (!main || !main.innerText.trim()),
      nav: !!document.querySelector('nav'),
      cards: !!main?.querySelector('a[href^="/idols/"] img'),
      profile: photo ? photo.alt.replace(/ photo$/, '') : null,
      animating: document.getAnimations().some((a) => (a as CSSAnimation).animationName === 'cardEntry' && a.playState === 'running'),
      pending: !!document.querySelector('.link-pending'),
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const frames = (page: Page) => page.evaluate(() => (window as unknown as { __frames: Frame[] }).__frames);
const cls = (page: Page) => page.evaluate(() => (window as unknown as { __cls: number }).__cls);
const clickAt = (page: Page) => page.evaluate(() => (window as unknown as { __clickAt: number | null }).__clickAt);
const now = (page: Page) => page.evaluate(() => performance.now());

function countDocumentLoads(page: Page) {
  const counter = { loads: 0 };
  page.on('request', (r) => { if (r.isNavigationRequest() && r.frame() === page.mainFrame()) counter.loads += 1; });
  return counter;
}

// The checks every navigation must pass: no blank frame, client-side only, no layout jump.
async function expectSmooth(page: Page, since: number, loads: { loads: number }, loadsBefore: number) {
  const after = (await frames(page)).filter((f) => f.t >= since);
  expect(after.length).toBeGreaterThan(0);
  expect(after.filter((f) => f.blank), 'blank frames').toEqual([]);
  expect(after.every((f) => f.nav), 'navbar on every frame').toBe(true);
  expect(loads.loads - loadsBefore, 'document loads').toBe(0);
  expect(await cls(page)).toBeLessThan(0.1);
  return after;
}

const press = (page: Page, isMobile: boolean, locator: ReturnType<Page['locator']>) =>
  (isMobile ? locator.tap() : locator.click());

// A screencast competes for the very frames the slow-data test times (~70 ms here); traces still
// record failures.
test.use({ video: 'off' });

test.describe('idols navigation @mobile', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  let preview: LocalServer;
  let idols: IdolRow[];
  const href = (i: IdolRow) => `/idols/${i.id}/${buildIdolSlug(i.artist_name, i.group_name)}`;

  test.beforeAll(async () => {
    idols = (await (await fetch('http://127.0.0.1:5000/api/idols-page')).json()) as IdolRow[];
    const build = spawnSync(process.execPath, [path.join(FRONTEND, 'node_modules/@react-router/dev/bin.cjs'), 'build'], {
      cwd: FRONTEND, stdio: 'inherit', shell: false,
      env: { ...process.env, E2E_ISOLATED: 'true', PRERENDER_API_URL: 'http://127.0.0.1:5000', VITE_API_URL: PREVIEW },
    });
    expect(build.status, 'react-router build').toBe(0);
    preview = new LocalServer(4173, process.execPath,
      [path.join(FRONTEND, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'],
      FRONTEND, { ...process.env, E2E_ISOLATED: 'true' });
    await preview.start();
  });

  test.afterAll(async () => {
    await preview?.stop();
  });

  test.beforeEach(async ({ page }) => {
    // On the context: tabs opened by a test are watched too.
    await page.context().addInitScript(monitor);
  });

  test('/idols → idol page (card) → another idol → back to /idols, all smooth', async ({ page, isMobile }) => {
    const loads = countDocumentLoads(page);
    await page.goto(`${PREVIEW}/idols`);
    await expect(page.locator('main a[href^="/idols/"]').first()).toBeVisible();
    const base = loads.loads;

    // Card click.
    let since = await now(page);
    const target = idols[3];
    await press(page, isMobile, page.locator(`main a[href="${href(target)}"]`));
    await expect(page.getByRole('img', { name: `${target.artist_name} photo` })).toBeVisible();
    await expectSmooth(page, since, loads, base);

    // Another idol from the profile's search.
    since = await now(page);
    const other = idols.find((i) => i.id !== target.id && /^[A-Za-z]{4,}$/.test(i.artist_name))!;
    await page.getByPlaceholder('Search for an Idol, Group, or Company...').fill(other.artist_name);
    await press(page, isMobile, page.locator(`main a[href="${href(other)}"]`).first());
    await expect(page.getByRole('img', { name: `${other.artist_name} photo` })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/idols/${other.id}/`));
    await expectSmooth(page, since, loads, base);

    // The in-app back link.
    since = await now(page);
    await press(page, isMobile, page.getByRole('link', { name: 'Back to the idols list' }));
    await expect(page.locator('main a[href^="/idols/"] img').first()).toBeVisible();
    await expect(page).toHaveURL(`${PREVIEW}/idols`);
    await expectSmooth(page, since, loads, base);
  });

  test('back to /idols restores the scroll position and does not replay the card entrance', async ({ page, isMobile }) => {
    const loads = countDocumentLoads(page);
    await page.goto(`${PREVIEW}/idols`);
    await expect(page.locator('main a[href^="/idols/"]').first()).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.waitForTimeout(300);
    const card = page.locator('main a[href^="/idols/"]').nth(isMobile ? 9 : 25);
    await card.scrollIntoViewIfNeeded();
    const leftAt = await page.evaluate(() => scrollY);
    expect(leftAt).toBeGreaterThan(500);
    const base = loads.loads;

    await press(page, isMobile, card);
    await expect(page.locator('main img[alt$=" photo"]')).toBeVisible();
    expect(await page.evaluate(() => scrollY)).toBe(0);

    const since = await now(page);
    await page.goBack();
    await expect(page.locator('main a[href^="/idols/"] img').first()).toBeVisible();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(leftAt - 5);
    expect(Math.abs((await page.evaluate(() => scrollY)) - leftAt)).toBeLessThanOrEqual(5);
    const after = await expectSmooth(page, since, loads, base);
    expect(after.filter((f) => f.animating), 'card entrance replayed').toEqual([]);
  });

  test('fast data: the next page is complete on its first frame, no loader', async ({ page, isMobile }) => {
    await page.goto(`${PREVIEW}/idols`);
    await expect(page.locator('main a[href^="/idols/"]').first()).toBeVisible();
    const target = idols[6];
    const since = await now(page);
    await press(page, isMobile, page.locator(`main a[href="${href(target)}"]`));
    await expect(page.getByRole('img', { name: `${target.artist_name} photo` })).toBeVisible();
    const after = (await frames(page)).filter((f) => f.t >= since);
    expect(after.filter((f) => f.loader), 'loader frames').toEqual([]);
    // Every frame shows either the old page or the complete new one.
    expect(after.every((f) => f.cards || f.profile === target.artist_name)).toBe(true);
  });

  test('slow data: the page switches at the hold, shows the loader for at least 500 ms', async ({ page, isMobile }) => {
    await page.goto(`${PREVIEW}/idols`);
    await expect(page.locator('main a[href^="/idols/"]').first()).toBeVisible();
    // Every source of an idol's data (prerendered .data and the API) answers 1 s late.
    const slow = async (route: import('@playwright/test').Route) => {
      await new Promise((r) => setTimeout(r, 1000));
      await route.continue();
    };
    await page.route(/\/idols\/\d+\/[^/]+\.data/, slow);
    await page.route(/\/api\/idols-page\/\d+/, slow);

    const target = idols[9];
    const card = page.locator(`main a[href="${href(target)}"]`);
    // As a user does: a pointer rests on the card, a finger touches it ~100 ms before the tap ends.
    // That intent loads the route code; the data request starts there too and stays 1 s slow.
    if (isMobile) await card.dispatchEvent('touchstart');
    else await card.hover();
    await page.waitForTimeout(isMobile ? 120 : 300);
    await press(page, isMobile, card);
    await expect(page.getByRole('img', { name: `${target.artist_name} photo` })).toBeVisible({ timeout: 10_000 });

    const clicked = (await clickAt(page))!;
    const after = (await frames(page)).filter((f) => f.t >= clicked);
    const firstLoader = after.find((f) => f.loader)!;
    const firstProfile = after.find((f) => f.profile === target.artist_name)!;
    expect(firstLoader, 'loader shown').toBeTruthy();
    // The 200 ms hold plus the router's commit and a paint: 245-280 ms measured, room for a busy machine.
    expect(firstLoader.t - clicked).toBeLessThan(330);
    expect(firstProfile.t - firstLoader.t).toBeGreaterThanOrEqual(500);
    // The pressed card while the navigation was held.
    expect(after.filter((f) => f.t < firstLoader.t).some((f) => f.pending), 'pressed state during the hold').toBe(true);
    expect(after.filter((f) => f.blank)).toEqual([]);
  });

  test('an idol page opened in a new tab: prerendered at once, other paths loader then page', async ({ page }) => {
    const target = idols[2];
    const loads = countDocumentLoads(page);

    // Prerendered: complete in the HTML, no loader at all.
    await page.goto(`${PREVIEW}${href(target)}`);
    await expect(page.getByRole('img', { name: `${target.artist_name} photo` })).toBeVisible();
    let all = await frames(page);
    expect(all.filter((f) => f.loader || f.blank)).toEqual([]);

    // Not prerendered (old slug): the SPA fallback's loader, then the page at its canonical URL.
    const context = page.context();
    const tab = await context.newPage();
    const errors: string[] = [];
    tab.on('pageerror', (e) => errors.push(e.message));
    await tab.goto(`${PREVIEW}/idols/${target.id}/old-slug`);
    await expect(tab.getByRole('img', { name: `${target.artist_name} photo` })).toBeVisible();
    await expect(tab).toHaveURL(`${PREVIEW}${href(target)}`);
    all = await frames(tab);
    expect(all.filter((f) => f.blank), 'blank frames').toEqual([]);
    expect(all.every((f) => f.loader || f.profile === target.artist_name), 'only the loader, then the page').toBe(true);
    expect(errors, 'no hydration errors').toEqual([]);
    expect(await cls(tab)).toBeLessThan(0.1);
    expect(loads.loads).toBe(1);
  });
});
