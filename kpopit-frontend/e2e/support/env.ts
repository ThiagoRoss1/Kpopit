import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const BACKEND_DIR = path.resolve(HERE, '../../../kpopit-backend');

// Project venv interpreter, relative to BACKEND_DIR (same as .claude/launch.json).
export const BACKEND_PYTHON =
  process.platform === 'win32' ? '.venv\\Scripts\\python.exe' : '.venv/bin/python';

// Backend EMAIL_DELIVERY=outbox writes every email here as JSON instead of calling Resend.
// Gitignored, cleared at the start of each run (playwright.config.ts).
export const EMAIL_OUTBOX_DIR = path.resolve(HERE, '../../.email-outbox');

// Email links point at the local dev server, never at the production site.
export const EMAIL_FRONTEND_URL = 'http://localhost:5173';

// Admin page route for the test env only (production keeps VITE_ADMIN_ROUTE unset).
export const ADMIN_ROUTE = '/e2e-admin';

// Every R2_* name the backend reads: all empty, so storage is off and tests never reach the buckets.
const R2_VARS = [
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_BACKUP_BUCKET_NAME',
  'R2_ENDPOINT_URL',
  'R2_AVATARS_ACCESS_KEY_ID',
  'R2_AVATARS_SECRET_ACCESS_KEY',
  'R2_AVATARS_BUCKET_NAME',
  'R2_AVATARS_PREFIX',
];

// Off unless a test turns them on: feature flags false, task routes disabled (empty keys).
const DISABLED = {
  CALENDAR_ENABLED: 'false',
  IDOL_XP_ENABLED: 'false',
  PUBLIC_PROFILE_ENABLED: 'false',
  BACKUP_AUTH_KEY: '',
  ACCOUNT_PURGE_AUTH_KEY: '',
  BACKUP_DB_URL: '',
};

export function testDatabaseUrl(): string {
  const url = process.env.E2E_DB_URL ?? process.env.DB_URL;
  if (!url) throw new Error('Set E2E_DB_URL to an explicit local test database; no .env files are read.');
  const parsed = new URL(url);
  const expected = process.env.E2E_DB_NAME ?? 'kpopit_pre_major_patch';
  const routingKeys = ['host', 'hostaddr', 'dbname', 'database', 'port', 'service'];
  if (routingKeys.some((key) => parsed.searchParams.has(key)) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) ||
      decodeURIComponent(parsed.pathname.slice(1)) !== expected || !['postgresql:', 'postgres:'].includes(parsed.protocol)) {
    throw new Error(`E2E only connects to the local ${expected} database.`);
  }
  return url;
}

// Explicit local targets and safe service settings. .env is never loaded: utils/env.py honors
// PYTHON_DOTENV_DISABLED and FLASK_SKIP_DOTENV stops `flask run` loading it on its own.
export function testBackendEnv(extra: Record<string, string> = {}): Record<string, string> {
  const env: Record<string, string> = {
    FLASK_ENV: 'development',
    PYTHON_DOTENV_DISABLED: '1',
    FLASK_SKIP_DOTENV: '1',
    JWT_SECRET_KEY: 'e2e-only-dummy-jwt-signing-key-at-least-32-characters',
    RESEND_EMAIL_FROM: 'test@example.com',
    COLLECTION_ENABLED: 'true',
    ADMIN_ENABLED: 'true',
    MAINTENANCE_MODE: 'false',
    RESEND_API_KEY: '',
    EMAIL_DELIVERY: 'outbox',
    EMAIL_OUTBOX_DIR,
    RESEND_EMAIL_FRONTEND_URL: EMAIL_FRONTEND_URL,
    TEST_DATE_OFFSET: '0',
    PYTHONUNBUFFERED: '1',
    PYTHONIOENCODING: 'utf-8',
  };
  for (const name of R2_VARS) env[name] = '';
  Object.assign(env, DISABLED);
  // A seeded DB (CI) instead of the local production copy in kpopit-backend/.env; see support/db.ts.
  env.DB_URL = testDatabaseUrl();
  return { ...env, ...extra };
}
