# Testing KpopIt locally

Two explicit local PostgreSQL test targets. Test runners do not load `.env` files. Export the local connection variables securely before running; never use a production URL.
Nothing here ever connects to production (Railway).

| Suite | Database | Env var | Notes |
|---|---|---|---|
| **pytest** (`kpopit-backend/tests/`) | `kpopit_test` | `TEST_DB_URL` | Every test TRUNCATEs and re-seeds it (see `conftest.py`). Disposable. |
| **Playwright E2E** (`kpopit-frontend/e2e/`), manual pass, day simulation | `kpopit_pre_major_patch` | `E2E_DB_URL` (plus `E2E_DB_NAME` when seeded) | A copy of production with **real user data**. Tests only add rows (new test users, their games/cards, future picks). Never truncate, never print or export its users. |

## pytest

```bash
cd kpopit-backend
.venv/Scripts/python.exe -m pytest -q        # Windows
.venv/bin/python -m pytest -q                # macOS/Linux
```

`kpopit_test` must be on the latest migration. Check/apply with the project's runner
pointed at the test DB (it reads `DB_URL`, so override it for the process only):

```powershell
# DB_URL must point at the local disposable test DB for this process only.
$env:DB_URL = $env:TEST_DB_URL
$env:PYTHON_DOTENV_DISABLED = '1'
.venv/Scripts/python.exe migrations/migrations.py
```

For a fresh seeded DB, `scripts/bootstrap_db.py` orchestrates init → migrations → CSVs →
collection cards and fails immediately on a migration error. CI still needs this orchestration.
Pytest refuses remote hosts and database names other than exactly `kpopit_test` before it can
TRUNCATE anything. Playwright checks both its helper and backend URL before connecting.


## Test servers (E2E / manual pass)

Same commands as `.claude/launch.json`:

- backend: `kpopit-backend/.venv/Scripts/python.exe app.py` → `http://127.0.0.1:5000`
- frontend: `cd kpopit-frontend && npm run dev:host` → `http://localhost:5173` (Vite proxies `/api` to :5000)

**Real services must be off.** `load_dotenv()` never overrides a variable that is already
set, but it still loads every other key from `.env` — so a forgot-password or
email-change call would send a real email through Resend. Always start the test
backend with these set in the process environment — to **dummy, non-empty**
values (on Windows an empty variable can vanish, and then `.env` fills in the real key):

```
FLASK_ENV=development  COLLECTION_ENABLED=true  RESEND_API_KEY=re_disabled_for_tests
EMAIL_DELIVERY=outbox  EMAIL_OUTBOX_DIR=<a gitignored folder>  RESEND_EMAIL_FRONTEND_URL=http://localhost:5173
R2_ENDPOINT_URL=http://127.0.0.1:9   and every other R2_* name = disabled-for-tests
(R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET_NAME R2_BACKUP_BUCKET_NAME R2_AVATARS_ACCESS_KEY_ID
 R2_AVATARS_SECRET_ACCESS_KEY R2_AVATARS_BUCKET_NAME R2_AVATARS_PREFIX)
```

With `EMAIL_DELIVERY=outbox` (honored only when `FLASK_ENV=development`), `EmailService._send`
writes each email as JSON (`to`, `subject`, `html`, `link`) into `EMAIL_OUTBOX_DIR` instead of
calling Resend; the dummy key is a second guard. E2E reads the links with
`e2e/support/outbox.ts` (`latestLink`); pytest gets a per-test `email_outbox` fixture and fails
any direct Resend call. Avatar uploads fail (R2 endpoint is a closed local port).

Playwright does this for you: export `E2E_DB_URL` and, for a seeded run, `E2E_DB_NAME=kpopit_e2e`.
`npm run test:e2e` runs one spec file at a time, workers 1, with a fresh backend + Vite per worker.
Worker fixtures launch direct child processes (no Flask reloader or shell) and wait for them to
exit. Multiday/rollover specs restart the same backend on :5000 for each day; ports 5101–5104
remain unused. The file runner checks that server ports are closed before and after each file.
Each file gets separate `playwright-report/<spec>/` and `test-results/<spec>/` artifacts.
Desktop/mobile Chromium run the full/mobile subsets, Firefox/WebKit run `@smoke`, and
mobile Safari runs `@mobile`. Browser requests to external services are stubbed locally;
image tests use the local site logo, and no test calls production/CDN/email/bucket services.
Test Vite uses `E2E_ISOLATED=true` to disable env-file loading.

`npm run test:lighthouse` does the same through `lighthouse/serve.mjs`.

PowerShell, by hand:

```powershell
cd kpopit-backend
$env:FLASK_ENV='development'; $env:COLLECTION_ENABLED='true'; $env:RESEND_API_KEY='re_disabled_for_tests'
'R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET_NAME','R2_BACKUP_BUCKET_NAME','R2_AVATARS_ACCESS_KEY_ID','R2_AVATARS_SECRET_ACCESS_KEY','R2_AVATARS_BUCKET_NAME','R2_AVATARS_PREFIX' | % { Set-Item "env:$_" 'disabled-for-tests' }
$env:R2_ENDPOINT_URL='http://127.0.0.1:9'
.venv\Scripts\python.exe app.py
```

(Never set them to `''` in PowerShell: that deletes the variable and `.env` wins.)

## Date offset ("play tomorrow")

`utils/dates.py` reads `TEST_DATE_OFFSET` (days, may be negative) from the
environment **only when `FLASK_ENV=development`**; production always ignores it
(`tests/test_dates_offset.py`). Default is off — nothing to revert in code.

```powershell
$env:TEST_DATE_OFFSET='1'   # tomorrow; 2, 3, 4... for a multi-day simulation
.venv\Scripts\python.exe app.py
```

Advance one day by restarting the backend with the next offset. The first request
of a "new" day draws that day's pick in `kpopit_pre_major_patch` (future rows in
`daily_picks`; harmless locally, gone after the next restore). The E2E rollover
spec (`e2e/rollover.spec.ts`) restarts its one backend with offset +1 on :5000.

Game-day offsets do not change JWT or token expiry clocks. Logged-in multiday play is covered
by `e2e/multiday.spec.ts` (+1..+4, one account, streak 1→4).

## Resetting `kpopit_pre_major_patch`

Restore it from a fresh production backup (e.g. in DBeaver). Tests and
the manual pass only add data, so a restore is only needed to start from a clean
production state again.
