import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import { closeDb } from './db';
import { LocalServer, OffsetBackend } from './tomorrow';
import { ADMIN_ROUTE } from './env';

let ipCounter = 0;
let currentIp = '10.0.0.1';

// Flask-Limiter keys on the client IP (ProxyFix trusts X-Forwarded-For), so each test gets a
// fake IP to keep rate limits apart. Only /api calls get it: on cross-origin font requests
// the custom header fails the CORS preflight.
function nextClientIp(): string {
  ipCounter += 1;
  const n = (Date.now() % 50_000) + ipCounter;
  return `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`;
}

// page.request calls bypass context routes, so they pass the header themselves.
export const ipHeader = (): Record<string, string> => ({ 'X-Forwarded-For': currentIp });

export async function tagApiRequests(context: BrowserContext, ip: string): Promise<void> {
  await context.route('**/api/**', (route) =>
    route.continue({ headers: { ...route.request().headers(), 'x-forwarded-for': ip } }),
  );
}

// CI has no image bucket: VITE_IMAGE_BUCKET_URL / VITE_AVATARS_BUCKET_URL point at a fake host
// listed in E2E_STUB_IMAGE_ORIGINS, and every request to it gets the 512px site logo (CORS-enabled,
// so the Pixelated canvas can read it; detailed enough for the de-pixelation check). Locally the
// variable is unset and real images load.
const STUB_IMAGE_ORIGINS = (process.env.E2E_STUB_IMAGE_ORIGINS ?? 'http://images.e2e.invalid').split(',').map((o) => o.trim()).filter(Boolean);
const STUB_IMAGE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/kpopit-icon.png');

export async function stubImageBuckets(context: BrowserContext): Promise<void> {
  for (const origin of STUB_IMAGE_ORIGINS) {
    await context.route(`${origin}/**`, (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', path: STUB_IMAGE, headers: { 'Access-Control-Allow-Origin': '*' } }),
    );
  }
}

// Noise that is not a site failure: dev-only tooling and third-party loads.
const IGNORED_CONSOLE = [
  /Download the React DevTools/i,
  /\[vite\]/i,
  /Vercel (Web Analytics|Speed Insights)/i,
  /_vercel\/(insights|speed-insights)/i,
];

export type ConsoleErrors = { list: string[] };

export const test = base.extend<{ consoleErrors: ConsoleErrors }, { backend: OffsetBackend }>({
  backend: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, provide) => {
      const backend = new OffsetBackend(0, 5000);
      const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
      const vite = new LocalServer(5173, process.execPath,
        [path.join(frontendDir, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5173', '--strictPort'],
        frontendDir, { ...process.env, VITE_COLLECTION_ENABLED: 'true', VITE_MAINTENANCE_MODE: 'false',
          VITE_ADMIN_ENABLED: 'true', VITE_ADMIN_ROUTE: ADMIN_ROUTE, E2E_ISOLATED: 'true',
          VITE_IMAGE_BUCKET_URL: 'http://images.e2e.invalid', VITE_AVATARS_BUCKET_URL: 'http://images.e2e.invalid',
          VITE_ENCRYPTION_KEY: 'e2e-only-dummy-encryption-key' });
      try {
        await backend.start();
        await vite.start();
        await provide(backend);
      } finally {
        try { await backend.stop(); }
        finally {
          try { await vite.stop(); }
          finally { await closeDb(); }
        }
      }
    },
    { scope: 'worker', auto: true },
  ],
  context: async ({ context }, provide) => {
    currentIp = nextClientIp();
    await tagApiRequests(context, currentIp);
    await stubImageBuckets(context);
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || STUB_IMAGE_ORIGINS.includes(url.origin)) {
        return route.fallback();
      }
      // Keep test browsers off production/CDN/analytics/font services. Empty CSS uses system fonts.
      return route.fulfill({ status: 200, contentType: url.hostname === 'fonts.googleapis.com' ? 'text/css' : 'text/plain', body: '' });
    });
    await provide(context);
  },
  consoleErrors: async ({ page }, provide) => {
    const errors: ConsoleErrors = { list: [] };
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
      errors.list.push(text);
    });
    page.on('pageerror', (err) => errors.list.push(`pageerror: ${err.message}`));
    await provide(errors);
  },
});

export { expect };
export type { Page };
