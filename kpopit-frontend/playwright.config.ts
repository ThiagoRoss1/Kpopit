import fs from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
import { EMAIL_OUTBOX_DIR } from './e2e/support/env';

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
    { name: 'firefox', grep: /@smoke/, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', grep: /@smoke/, use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-safari', grep: /@mobile/, use: { ...devices['iPhone 15'] } },
  ],
  // The worker fixture owns one backend + one Vite (direct child processes, no shell/reloader).
  // It waits for both to exit. Date-offset specs restart that backend instead of adding servers.
});
