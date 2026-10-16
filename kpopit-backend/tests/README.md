# Testing KpopIt locally

Two local PostgreSQL databases, both already configured in `kpopit-backend/.env`.
Nothing here ever connects to production (Railway).

| Suite | Database | Env var | Notes |
|---|---|---|---|
| **pytest** (`kpopit-backend/tests/`) | `kpopit_test` | `TEST_DB_URL` | Every test TRUNCATEs and re-seeds it (see `conftest.py`). Disposable. |
| **Playwright E2E** (`kpopit-frontend/e2e/`), manual pass, day simulation | `kpopit_pre_major_patch` | `DB_URL` | A copy of production with **real user data**. Tests only add rows (new test users, their games/cards, future picks). Never truncate, never print or export its users. |

## pytest

```bash
cd kpopit-backend
.venv/Scripts/python.exe -m pytest -q        # Windows
.venv/bin/python -m pytest -q                # macOS/Linux
```

`kpopit_test` must be on the latest migration. Check/apply with the project's runner
pointed at the test DB (it reads `DB_URL`, so override it for the process only):

```bash
.venv/Scripts/python.exe -c "import os; from dotenv import load_dotenv; load_dotenv('.env'); os.environ['DB_URL'] = os.environ['TEST_DB_URL']; from migrations.migrations import apply_migrations; apply_migrations()"
```

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
R2_ENDPOINT_URL=http://127.0.0.1:9   and every other R2_* name = disabled-for-tests
(R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET_NAME R2_AVATARS_ACCESS_KEY_ID
 R2_AVATARS_SECRET_ACCESS_KEY R2_AVATARS_BUCKET_NAME R2_AVATARS_PREFIX)
```

Resend rejects the dummy key, so every send fails safely (`EmailService` logs and
returns `False`) and no email is delivered; the forgot-password route still answers
its generic success message. No code stub is needed. The E2E reset-password test
issues the token itself (same SHA-256 scheme as `routes/email.py`) instead of
reading an email. Avatar uploads fail (R2 endpoint is a closed local port).

Playwright does this for you: `npm run test:e2e` starts both servers from
`playwright.config.ts` (`webServer`, env from `e2e/support/env.ts`). It refuses to
reuse a backend already listening on :5000 — stop your own dev server first.
`npm run test:lighthouse` does the same through `lighthouse/serve.mjs`.

PowerShell, by hand:

```powershell
cd kpopit-backend
$env:FLASK_ENV='development'; $env:COLLECTION_ENABLED='true'; $env:RESEND_API_KEY='re_disabled_for_tests'
'R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET_NAME','R2_AVATARS_ACCESS_KEY_ID','R2_AVATARS_SECRET_ACCESS_KEY','R2_AVATARS_BUCKET_NAME','R2_AVATARS_PREFIX' | % { Set-Item "env:$_" 'disabled-for-tests' }
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
spec (`e2e/rollover.spec.ts`) starts a second backend with offset +1 on :5101 and
points the page's `/api` calls at it.

Known limitation: the offset also shifts `get_datetime_now_utc()`, which stamps the
JWT `iat`. PyJWT ≥ 2.10 rejects tokens issued "in the future", so **logged-in**
play breaks while the offset is non-zero (access tokens fail, refresh loops).
Anonymous play works. Use anonymous users for day simulations.

## Resetting `kpopit_pre_major_patch`

Restore it from a fresh production backup (e.g. in DBeaver). Tests and
the manual pass only add data, so a restore is only needed to start from a clean
production state again.
