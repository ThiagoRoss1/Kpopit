import fs from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
import { ADMIN_ROUTE, BACKEND_DIR, BACKEND_PYTHON, EMAIL_OUTBOX_DIR, testBackendEnv } from './e2e/support/env';

// Fresh email outbox per run. Workers load this file too (TEST_WORKER_INDEX set): they must not wipe it.
if (!process.env.TEST_WORKER_INDEX) fs.rmSync(EMAIL_OUTBOX_DIR, { recursive: true, force: true });

// Vite dev server by default; override with PLAYWRIGHT_BASE_URL to test another target.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      // Mobile runs only the navigation/page tests plus one full game per mode.
      name: 'mobile',
      grep: /@mobile/,
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
  // Same commands as .claude/launch.json. The backend never reuses a running server:
  // a dev server started by hand would not carry the overrides below (real emails, R2).
  webServer: [
    {
      command: `${BACKEND_PYTHON} app.py`,
      cwd: BACKEND_DIR,
      url: 'http://127.0.0.1:5000/api/gamemodes-count',
      reuseExistingServer: false,
      timeout: 120_000,
      env: testBackendEnv(),
      stdout: 'ignore',
      // Flask logs every request to stderr; set E2E_BACKEND_LOGS=1 to see them.
      stderr: process.env.E2E_BACKEND_LOGS ? 'pipe' : 'ignore',
    },
    {
      command: 'npm run dev:host',
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120_000,
      // The admin page is on only in the test env, at a fixed route the admin spec can visit.
      env: { VITE_COLLECTION_ENABLED: 'true', VITE_MAINTENANCE_MODE: 'false', VITE_ADMIN_ENABLED: 'true', VITE_ADMIN_ROUTE: ADMIN_ROUTE },
    },
  ],
});
