import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test, expect } from './support/fixtures';
import { LocalServer } from './support/tomorrow';
import { buildAlbumSlug, buildIdolSlug } from '../src/utils/formatters';

// Crawlers and link previews don't run JavaScript: the production build (prerendered from the test
// backend on :5000) must already carry each page's meta and content in its HTML.
const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW = 'http://127.0.0.1:4173';

type IdolRow = { id: number; artist_name: string; group_name: string | null };
const slug = (i: IdolRow) => buildIdolSlug(i.artist_name, i.group_name);
const BLOG_POSTS = fs.readdirSync(path.join(FRONTEND, 'content/blog')).filter((f) => f.endsWith('.md')).map((f) => `/blog/${f.replace(/\.md$/, '')}`);
const BLOG_POST = BLOG_POSTS[0];

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
    expect(attr(html, /<title>([^<]*)<\/title>/)).toBe('K-pop idols in KpopIt: every idol in the daily game');
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(meta(html, 'description')).toContain('K-pop idol');
    expect(meta(html, 'og:title')).toBe('K-pop idols in KpopIt: every idol in the daily game');
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

  // One head per page: a duplicated title/description or broken JSON-LD silently hurts search results.
  test('each prerendered page has one title, one description and valid JSON-LD', async ({ request }) => {
    const pages = ['/', '/classic', '/blurry', '/pixelated', '/idols', '/privacy-policy', '/contact', '/about', '/how-to-play',
      '/faq', '/blog', '/changelog', BLOG_POST, `/idols/${idol.id}/${slug(idol)}`];
    for (const p of pages) {
      const html = await (await request.get(`${PREVIEW}${p}`)).text();
      expect(html.match(/<title>/g), `${p} title`).toHaveLength(1);
      expect(html.match(/<meta name="description"/g), `${p} description`).toHaveLength(1);
      expect(html.match(/<link rel="canonical"/g), `${p} canonical`).toHaveLength(1);
      expect(attr(html, /<link rel="canonical" href="([^"]*)"/), `${p} canonical`).toBe(`https://kpopit.net${p}`);
      expect(meta(html, 'og:url'), `${p} og:url`).toBe(`https://kpopit.net${p}`);
      expect(meta(html, 'og:image'), `${p} og:image`).toMatch(/^https?:\/\//);
      expect(meta(html, 'twitter:title'), `${p} twitter:title`).toBeTruthy();
      const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
      const types = blocks.map((block) => {
        const data = JSON.parse(block);
        expect(data['@context'], `${p} @context`).toBe('https://schema.org');
        return data['@type'];
      });
      // WebApplication describes the home page only; FAQPage lives on /faq, next to the visible questions.
      if (p === '/') expect(types.sort(), `${p} JSON-LD`).toEqual(['WebApplication', 'WebSite']);
      else if (p === '/faq') expect(types, `${p} JSON-LD`).toEqual(['FAQPage']);
      else expect(types.filter((t) => t === 'WebApplication' || t === 'FAQPage'), `${p} JSON-LD`).toEqual([]);
      if (p === BLOG_POST) expect(types).toContain('BlogPosting');
      if (p.startsWith('/idols/')) expect(types).toContain('ProfilePage');
    }
  });

  test('the build writes a sitemap of the prerendered pages', async ({ request }) => {
    const sitemap = await (await request.get(`${PREVIEW}/sitemap.xml`)).text();
    const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    const pages = ['/', '/classic', '/blurry', '/pixelated', '/idols', '/privacy-policy', '/contact', '/about', '/how-to-play', '/faq', '/blog', '/changelog', ...BLOG_POSTS, '/albums'];
    for (const p of pages) expect(locs).toContain(`https://kpopit.net${p}`);
    expect(locs).toContain(`https://kpopit.net/idols/${idol.id}/${slug(idol)}`);
    const albums = (await (await fetch('http://127.0.0.1:5000/api/albums-page')).json()) as { id: number; name: string; artist_name: string }[];
    expect(locs.filter((l) => l.includes('/albums/'))).toHaveLength(albums.length);
    expect(locs).toHaveLength(pages.length + idols.length + albums.length);
    for (const p of ['/idol-xp', '/profile', '/login', '/major-patch']) {
      expect(locs.some((loc) => loc.startsWith(`https://kpopit.net${p}`))).toBe(false);
    }
    const robots = await (await request.get(`${PREVIEW}/robots.txt`)).text();
    expect(robots).toContain('Sitemap: https://kpopit.net/sitemap.xml');
  });

  test('content pages carry their text in the HTML and a post its own og:image', async ({ request }) => {
    const text = async (p: string) => (await request.get(`${PREVIEW}${p}`)).text();
    expect(await text('/faq')).toContain('Is KpopIt free to play?');
    expect(await text('/changelog')).toContain('New game mode: Pixelated');
    expect(await text('/privacy-policy')).toContain('IN SHORT');
    expect(await text('/how-to-play')).toContain('HOW TO PLAY');
    expect(await text('/about')).toContain('WHO MAKES IT');
    const post = await text(BLOG_POST);
    expect(meta(post, 'og:image')).toMatch(/^https:\/\/kpopit\.net\/blog\/.+\.(png|webp|jpg)$/);
    expect(post).toContain('class="post-body"');
  });

  test('an album page has its name, artist and MusicAlbum JSON-LD in the HTML', async ({ request }) => {
    const [album] = (await (await fetch('http://127.0.0.1:5000/api/albums-page')).json()) as { id: number; name: string; artist_name: string }[];
    const path = `/albums/${album.id}/${buildAlbumSlug(album.name, album.artist_name)}`;
    const html = await (await request.get(`${PREVIEW}${path}`)).text();
    expect(attr(html, /<link rel="canonical" href="([^"]*)"/)).toBe(`https://kpopit.net${path}`);
    expect(attr(html, /<title>([^<]*)<\/title>/)).toContain(album.artist_name.replace(/&/g, '&amp;').replace(/'/g, '&#x27;'));
    expect(html).toContain('"@type":"MusicAlbum"');
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
    for (const p of ['/', '/classic', '/blurry', '/pixelated', '/idols', `/idols/${idol.id}/${slug(idol)}`, '/privacy-policy', '/contact',
      '/about', '/how-to-play', '/faq', '/blog', '/changelog', BLOG_POST]) {
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
