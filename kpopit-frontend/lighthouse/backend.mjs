// The test backend (same overrides as Playwright: no Resend/R2) on :5000, for the build's
// prerender and for the preview's /api proxy.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../kpopit-backend');
const win = process.platform === 'win32';
const python = path.join(BACKEND, win ? '.venv/Scripts/python.exe' : '.venv/bin/python');

const R2_VARS = [
  'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_BACKUP_BUCKET_NAME', 'R2_ENDPOINT_URL',
  'R2_AVATARS_ACCESS_KEY_ID', 'R2_AVATARS_SECRET_ACCESS_KEY', 'R2_AVATARS_BUCKET_NAME', 'R2_AVATARS_PREFIX',
];

// Same isolation as e2e/support/env.ts: an explicit local DB, .env never loaded, every service off.
function localDbUrl() {
  const url = process.env.E2E_DB_URL ?? process.env.DB_URL;
  if (!url) throw new Error('Set E2E_DB_URL to a local test database; no .env files are read.');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)) {
    throw new Error('Lighthouse only connects to a local database.');
  }
  return url;
}

function backendEnv() {
  return {
    ...process.env,
    PYTHON_DOTENV_DISABLED: '1',
    FLASK_SKIP_DOTENV: '1',
    DB_URL: localDbUrl(),
    FLASK_ENV: 'development',
    JWT_SECRET_KEY: 'lighthouse-only-dummy-jwt-signing-key-at-least-32-chars',
    COLLECTION_ENABLED: 'true',
    MAINTENANCE_MODE: 'false',
    CALENDAR_ENABLED: 'false',
    IDOL_XP_ENABLED: 'false',
    PUBLIC_PROFILE_ENABLED: 'false',
    ADMIN_ENABLED: 'false',
    RESEND_API_KEY: '',
    EMAIL_DELIVERY: 'outbox',
    BACKUP_AUTH_KEY: '',
    ACCOUNT_PURGE_AUTH_KEY: '',
    BACKUP_DB_URL: '',
    TEST_DATE_OFFSET: '0',
    ...Object.fromEntries(R2_VARS.map((k) => [k, ''])),
  };
}

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
  // Like the E2E fixture: no debug reloader and no shell. app.py's reloader never came up with stdio ignored.
  const child = spawn(python, ['-m', 'flask', '--app', 'app', 'run', '--port', '5000', '--no-reload'],
    { cwd: BACKEND, env: backendEnv(), stdio: 'ignore', shell: false });
  await waitFor('http://127.0.0.1:5000/api/gamemodes-count');
  return child;
}
