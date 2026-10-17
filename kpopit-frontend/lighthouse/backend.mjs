// The test backend (same overrides as Playwright: no Resend/R2) on :5000, for the build's
// prerender and for the preview's /api proxy.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../kpopit-backend');
const win = process.platform === 'win32';
const python = win ? '.venv\Scripts\python.exe' : '.venv/bin/python';

const R2_VARS = [
  'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_ENDPOINT_URL',
  'R2_AVATARS_ACCESS_KEY_ID', 'R2_AVATARS_SECRET_ACCESS_KEY', 'R2_AVATARS_BUCKET_NAME', 'R2_AVATARS_PREFIX',
];
const backendEnv = {
  ...process.env,
  FLASK_ENV: 'development',
  COLLECTION_ENABLED: 'true',
  MAINTENANCE_MODE: 'false',
  // Dummy values, never empty (see e2e/support/env.ts).
  RESEND_API_KEY: 're_disabled_for_tests',
  TEST_DATE_OFFSET: '0',
  ...Object.fromEntries(R2_VARS.map((k) => [k, k === 'R2_ENDPOINT_URL' ? 'http://127.0.0.1:9' : 'disabled-for-tests'])),
};

export function stopProcess(child) {
  if (!child.pid) return;
  if (win) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
}

export async function waitFor(url) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${url} did not come up`);
}

export async function startBackend() {
  const child = spawn(python, ['app.py'], { cwd: BACKEND, env: backendEnv, stdio: 'ignore', shell: win });
  await waitFor('http://127.0.0.1:5000/api/gamemodes-count');
  return child;
}
