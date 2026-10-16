// lhci starts one command, so this runs both the test backend (same overrides as
// Playwright: no Resend/R2) and vite preview, whose proxy forwards /api to :5000.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '..');
const BACKEND = path.resolve(FRONTEND, '../kpopit-backend');
const win = process.platform === 'win32';
const python = win ? '.venv\\Scripts\\python.exe' : '.venv/bin/python';

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

const children = [
  spawn(python, ['app.py'], { cwd: BACKEND, env: backendEnv, stdio: 'ignore', shell: win }),
  spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { cwd: FRONTEND, stdio: 'ignore', shell: win }),
];

function stopAll() {
  for (const c of children) {
    if (!c.pid) continue;
    if (win) spawn('taskkill', ['/pid', String(c.pid), '/T', '/F'], { stdio: 'ignore' });
    else c.kill('SIGTERM');
  }
}
process.on('SIGINT', () => { stopAll(); process.exit(0); });
process.on('SIGTERM', () => { stopAll(); process.exit(0); });
process.on('exit', stopAll);

async function waitFor(url) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${url} did not come up`);
}

await waitFor('http://127.0.0.1:5000/api/gamemodes-count');
await waitFor('http://localhost:4173/api/gamemodes-count');
console.log('LIGHTHOUSE_SERVER_READY');
setInterval(() => {}, 1 << 30);
