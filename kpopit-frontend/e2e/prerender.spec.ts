import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test, expect } from './support/fixtures';
import { LocalServer } from './support/tomorrow';
import { buildIdolSlug } from '../src/utils/formatters';

// Crawlers and link previews don't run JavaScript: the production build (prerendered from the test
// backend on :5000) must already carry each page's meta and content in its HTML.
const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW = 'http://127.0.0.1:4173';

type IdolRow = { id: number; artist_name: string; group_name: string | null };
const slug = (i: IdolRow) => buildIdolSlug(i.artist_name, i.group_name);

const attr = (html: string, selector: RegExp) => html.match(selector)?.[1];
const meta = (html: string, key: string) =>
  attr(html, new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`));

test.describe('prerendered pages without JavaScript', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  let preview: LocalServer;
  let idols: IdolRow[];
  let idol: IdolRow;

  test.beforeAll(async () => {
    idols = (await (await fetch('http://127.0.0.1:5000/api/idols-page')).json()) as IdolRow[];
    // A plain-ASCII name, so the page text matches the slug's spelling.
    idol = idols.find((i) => i.group_name && /^[A-Za-z0-9 ]+$/.test(i.artist_name))!;

    const build = spawnSync(process.execPath, [path.join(FRONTEND, 'node_modules/@react-router/dev/bin.cjs'), 'build'], {
      cwd: FRONTEND, stdio: 'inherit', shell: false,
      // The preview proxies /api to the test backend, so the built app calls its own origin.
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

  test('/idols has its meta and the idol list in the HTML', async ({ request }) => {
    const html = await (await request.get(`${PREVIEW}/idols`)).text();
    expect(attr(html, /<title>([^<]*)<\/title>/)).toBe('KpopIt - Idols List');
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(meta(html, 'description')).toContain('K-pop idol');
    expect(meta(html, 'og:title')).toBe('KpopIt - Idols List');
    expect(meta(html, 'og:description')).toBeTruthy();
    expect(html).toContain(idol.artist_name);
    expect(html).toContain(`/idols/${idol.id}/${slug(idol)}`);
  });

  test('an idol page has the name, group and meta in the HTML', async ({ request }) => {
    const html = await (await request.get(`${PREVIEW}/idols/${idol.id}/${slug(idol)}`)).text();
    const title = attr(html, /<title>([^<]*)<\/title>/) ?? '';
    expect(title).toContain(idol.artist_name);
    expect(title).toContain(idol.group_name!);
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(meta(html, 'description')).toContain(idol.artist_name);
    expect(meta(html, 'og:title')).toContain(idol.artist_name);
    expect(meta(html, 'og:description')).toContain(idol.group_name!);
    // The page itself, not a streamed loader with the content hidden until JavaScript swaps it in.
    expect(html).not.toContain('role="status"');
  });

  test.describe('in a browser', () => {
    test.use({ javaScriptEnabled: false });

    test('the idol page shows its content with JavaScript disabled', async ({ page }) => {
      await page.goto(`${PREVIEW}/idols/${idol.id}/${slug(idol)}`);
      await expect(page).toHaveTitle(new RegExp(idol.artist_name));
      // Attached, not visible: the entry animation starts at opacity 0 until JavaScript runs.
      await expect(page.getByText(idol.artist_name, { exact: true }).first()).toBeAttached();
      await expect(page.getByText(idol.group_name!, { exact: true }).first()).toBeAttached();
    });
  });

  // A prerendered page that renders differently in the browser logs a hydration error and is rebuilt.
  test('prerendered pages hydrate without console errors', async ({ page, consoleErrors }) => {
    // Vercel serves the analytics scripts itself; a local production build has no /_vercel/ route.
    await page.route('**/_vercel/**', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    const failed: string[] = [];
    page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
    for (const p of ['/', '/classic', '/blurry', '/pixelated', '/idols', `/idols/${idol.id}/${slug(idol)}`, '/privacy-policy', '/contact']) {
      await page.goto(`${PREVIEW}${p}`);
      await page.waitForLoadState('networkidle');
      expect(consoleErrors.list, `${p}: ${failed.join(', ')}`).toEqual([]);
    }
  });

  // Like an idol added after the build: no prerendered file, so the SPA fallback loads it live.
  test('an idol path without a prerendered page loads from the fallback', async ({ page }) => {
    await page.route('**/_vercel/**', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await page.goto(`${PREVIEW}/idols/${idol.id}/not-the-slug`);
    await expect(page).toHaveURL(new RegExp(`/idols/${idol.id}/${slug(idol)}$`));
    await expect(page).toHaveTitle(new RegExp(idol.artist_name));
  });

  // Was ≈1.0 when the whole list appeared at once after a fixed loader.
  test('/idols keeps its layout while loading (CLS < 0.1)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/_vercel/**', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
          if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(`${PREVIEW}/idols`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBeLessThan(0.1);
  });

  test('every idol has a prerendered page', () => {
    const missing = idols.filter((i) =>
      !fs.existsSync(path.join(FRONTEND, 'build/client/idols', String(i.id), slug(i), 'index.html')));
    expect(missing.map((i) => `${i.id} ${slug(i)}`)).toEqual([]);
  });

  // Slugs used to keep punctuation ("y:sy-fromis_9"); shared old links must land on the canonical page.
  test('an old punctuated slug redirects to the canonical one', async ({ page }) => {
    await page.route('**/_vercel/**', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    const punctuated = idols.find((i) => i.artist_name.includes(':'))!;
    const oldSlug = [punctuated.artist_name, punctuated.group_name].filter(Boolean).join('-').replace(/\s+/g, '-').toLowerCase();
    await page.goto(`${PREVIEW}/idols/${punctuated.id}/${encodeURIComponent(oldSlug)}`);
    await expect(page).toHaveURL(new RegExp(`/idols/${punctuated.id}/${slug(punctuated)}$`));
    expect(slug(punctuated)).toMatch(/^[a-z0-9_-]+$/);
  });

  test('game pages and the SPA fallback are served', async ({ request }) => {
    const classic = await (await request.get(`${PREVIEW}/classic`)).text();
    expect(attr(classic, /<title>([^<]*)<\/title>/)).toBe('KpopIt Classic - K-pop Idol Guessing Game');
    expect(meta(classic, 'description')).toBeTruthy();
    // A route with no prerendered file gets the fallback shell, not the prerendered home page.
    const login = await request.get(`${PREVIEW}/login`);
    expect(login.ok()).toBeTruthy();
    expect(await login.text()).not.toContain('Daily K-pop Idol Wordle Guessing Game</title>');
  });
});
