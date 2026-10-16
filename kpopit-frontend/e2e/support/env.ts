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

// Every R2_* name the backend reads; all get dummy values so tests never reach the buckets.
const R2_VARS = [
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_ENDPOINT_URL',
  'R2_AVATARS_ACCESS_KEY_ID',
  'R2_AVATARS_SECRET_ACCESS_KEY',
  'R2_AVATARS_BUCKET_NAME',
  'R2_AVATARS_PREFIX',
];

// Dummy values, never empty: on Windows an empty variable can be dropped from
// the child environment, and then load_dotenv() would fill in the real key.
export const DISABLED_RESEND_KEY = 're_disabled_for_tests';
export const DISABLED_R2 = 'disabled-for-tests';
export const DISABLED_R2_ENDPOINT = 'http://127.0.0.1:9'; // discard port: uploads fail fast

// load_dotenv() never overrides a variable that is already set, so these beat
// kpopit-backend/.env: emails go to the outbox, and the dummy Resend key is a second guard.
export function testBackendEnv(extra: Record<string, string> = {}): Record<string, string> {
  const env: Record<string, string> = {
    FLASK_ENV: 'development',
    COLLECTION_ENABLED: 'true',
    ADMIN_ENABLED: 'true',
    MAINTENANCE_MODE: 'false',
    RESEND_API_KEY: DISABLED_RESEND_KEY,
    EMAIL_DELIVERY: 'outbox',
    EMAIL_OUTBOX_DIR,
    RESEND_EMAIL_FRONTEND_URL: EMAIL_FRONTEND_URL,
    TEST_DATE_OFFSET: '0',
    PYTHONUNBUFFERED: '1',
    PYTHONIOENCODING: 'utf-8',
  };
  for (const name of R2_VARS) env[name] = name === 'R2_ENDPOINT_URL' ? DISABLED_R2_ENDPOINT : DISABLED_R2;
  // A seeded DB (CI) instead of the local production copy in kpopit-backend/.env; see support/db.ts.
  if (process.env.E2E_DB_URL) env.DB_URL = process.env.E2E_DB_URL;
  return { ...env, ...extra };
}
