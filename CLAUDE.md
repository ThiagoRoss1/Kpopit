# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**KpopIt** is a Wordle-inspired daily K-pop guessing game with three live modes: **Classic** (`gamemode_id=1`) — guess the daily idol by comparing attributes; **Blurry** (`gamemode_id=2`) — identify the idol from an increasingly unblurred photo; **Pixelated** (`gamemode_id=3`) — guess the daily album from progressively de-pixelating cover art. All users worldwide share the same daily challenge per mode, resetting at midnight EST.

## Repository Structure

```
kpopit/
├── kpopit-frontend/    # React + TypeScript + Vite app (deployed on Vercel)
└── kpopit-backend/     # Python Flask API (deployed on Railway/Render)
```

## Commands

### Frontend (`kpopit-frontend/`)
```bash
npm run dev       # Start dev server (react-router dev, Vite with HMR)
npm run build     # TypeScript compile + react-router build (prerenders; needs the backend, see PRERENDER_API_URL)
npm run lint      # Run ESLint (--max-warnings 0, same as CI)
npm run preview   # Preview production build
```

### Backend (`kpopit-backend/`)
```bash
python app.py         # Start Flask dev server (debug=True)
python init_db.py     # Initialize database schema
python seed_db.py     # Seed database with idol data
gunicorn app:app      # Production server
```

## Architecture

### Data Flow
1. Frontend generates a UUID user token via `POST /api/user/init` and encrypts it in localStorage
2. On game load, frontend fetches the daily challenge — Classic: `GET /api/game/classic/daily-idol`, Blurry: `GET /api/game/blurry/daily-idol`, Pixelated: `GET /api/game/pixelated/daily-album`
3. User guesses are submitted and the backend returns per-attribute feedback (`correct`, `partial`, `higher`, `lower`, `incorrect`)
4. Game state (guesses, completion, hints revealed) is persisted in localStorage and cleared on new day detection
5. All stats and history are stored server-side in PostgreSQL, keyed by user token

### Backend (`kpopit-backend/`)
- **`app.py`** — Flask entry point; registers 14 blueprints under `/api` (+ `admin` when `ADMIN_ENABLED`), handles CORS and maintenance mode
- **`routes/games/`** — Game endpoints for classic, blurry, and pixelated modes; all support `gamemode_id` query param (1=classic, 2=blurry, 3=pixelated)
- **`services/`** — Business logic layer: `daily_draw.py` runs the one daily draw shared by every mode (`ensure_daily_picks`: stateless from `daily_picks`, 10-day cooldown, ultimatum for overdue items, capped wait weight + never-picked boost + late pressure; draws one day ahead, tomorrow's pick is never returned or logged); `game_service.py` handles streaks and scoring; `album_service.py` handles Pixelated mode — `AlbumService.process_guess` delegates to `GameService.save_user_history` (single source of truth for upsert/score/streak/commit — never duplicate this logic for new modes)
- **`repositories/`** — Data access layer over PostgreSQL
- **`utils/game_feedback_logic.py`** — Feedback comparison engine (exact match, partial group match, higher/lower for numerical fields)
- **`utils/dates.py`** — All daily reset logic is EST-anchored

### Frontend (`kpopit-frontend/src/`)
- **`app/`** (next to `src/`) — React Router 8 framework mode, `ssr: false` (static build on Vercel, output `build/client`). `root.tsx` holds the site-wide `<head>` and the providers (QueryClient, Helmet, AuthProvider, ScrollToTop, Vercel Analytics/Speed Insights) and maintenance mode; `routes.ts` lists the routes (MainLayout and ProtectedRoute as layouts) pointing at thin modules in `app/routes/` that render the `src/pages` components. Collections checks its env flag inside the route module; the admin route is only registered (at `VITE_ADMIN_ROUTE`) when `VITE_ADMIN_ENABLED=true`, read in `routes.ts` via Vite's `loadEnv`, so without the flag it isn't in the build. `react-router.config.ts` prerenders `/`, the three game pages, `/idols`, `/privacy-policy`, `/contact` and every `/idols/:id/:slug`; other routes load from `__spa-fallback.html` (the `vercel.json` rewrite)
- **Prerender rules** — Prerendered HTML must match the first browser render: browser-only values (storage, viewport, today's date) wait for `useHydrated()` / `<ClientOnly>`; game pages render client-only behind `app/game-page.tsx`. Each page sets its own title/description/og via Helmet (the root head has none). Idol slugs come only from `buildIdolSlug` (`[a-z0-9-_]`); the idol page redirects any other slug to the canonical one
- **`hooks/useSharedGameData.tsx`** — Core state hook: user token (issue/decrypt, readiness as a query), the `["allIdols"]` list, user stats
- **`components/GameDayProvider.tsx`** — Wraps every game page: keys the page by its game day (a new day remounts it, no reload), runs the midnight countdown, and refetches on the api's "Game date mismatch" event. Daily queries spread `DAILY_REFETCH` (refetch on tab focus/visibility + every 30 min), so a new `server_date` is noticed with the tab open
- **`hooks/`** — `useGameMode`, `useResetTimer`, `useIdolSearch`, `useTransferDataLogic`
- **`services/api.ts`** — Axios client; attaches decrypted user token to every request via interceptor
- **`pages/`** — `ClassicMode/`, `BlurryMode/`, `PixelatedMode/`, `Idols/` (list + `/:id/:slug` profile), `Home/`, `admin/`. Pixelated uses client-side album search (`["allAlbums"]` cached, no search endpoint) and `components/Pixelated/` (canvas, search bar, guess grid, hints, victory card)
- **`interfaces/gameInterfaces.ts`** — Central TypeScript type definitions for all game data shapes
- **`utils/tokenEncryption.ts`** — AES encryption/decryption for localStorage token storage

### State Management
- **React Query (TanStack Query)** — All server state; `["allIdols"]` / `["allAlbums"]` start from a localStorage copy (`utils/persistedList.ts`, versioned keys, ignored after 7 days) and refetch once per visit, `["userStats", token]` per-user
- **localStorage** — Game state per mode: `GuessedIdols`, `todayGuessesDetails`, `gameComplete`, `gameWon`, `hint1Revealed`, `hint2Revealed`, plus `{mode}_lastPlayedDate` for day-change detection
- No React Context — React Query replaces global state needs

## Authentication
- **Auth approach** — Optional JWT layer on top of the anonymous UUID flow. Access token (1h) lives in React memory; refresh token (30d) is an httpOnly cookie scoped to `/api/auth`; anonymous UUID stays in encrypted localStorage for users who never sign up. `Authorization` header accepts either `Bearer <jwt>` (authenticated) or a bare UUID (anonymous) — all existing game routes keep working with both via `@optional_auth`.
- **Endpoints** — All under `/api/auth/`: `register`, `login`, `logout`, `refresh`, `me`, `claim` (upgrades an anonymous UUID into a real account without losing history — `users.id` never changes). Password-reset and email-verification flows live under `/api/auth/email/` (see `routes/email.py`) and use the unified `email_tokens` table.
- **Rate limiting** — Flask-Limiter keyed per client IP (via `ProxyFix(x_for=1)` on `app.wsgi_app`), in-memory storage. Limits per route: `register`/`claim` 5/min, `login` 10/min, `refresh` 30/min. A custom `RateLimitExceeded` handler returns JSON 429 and preserves the `Retry-After` header (exposed through CORS so the frontend can read it).
- **New files**
  - `routes/auth.py` — all `/api/auth/*` endpoints with `@limiter.limit` decorators
  - `services/auth_service.py` — bcrypt (cost 12), JWT encode/decode, register/login/claim flows
  - `repositories/user_repository.py` — all auth + profile DB queries
  - `utils/auth_helpers.py` — `detect_user()` (UUID vs JWT), `decode_jwt()` (HS256-pinned, `type` claim validated), input validators
  - `utils/auth_decorators.py` — `@optional_auth`, `@require_auth`, `@require_admin`
  - `utils/rate_limiter.py` — shared `Limiter` instance, `init_app`'d from `app.py`
- **New tables** — `user_profiles` (display_name, avatar_url), `refresh_tokens` (SHA-256 hashed, revocable on logout/reset), `email_tokens` (SHA-256 hashed, `token_type`-discriminated for `verification` and `password_reset`, used by `routes/email.py`)

## Email Workflows (`routes/email.py`)
- **Endpoints** — All under `/api/auth/email/`: `send-verification-email` (requires auth), `verify-email`, `forgot-password`, `reset-password`, `request-email-change` (requires auth + current password), `confirm-email-change`, `revert-email-change`.
- **Token model** — All flows use the shared `email_tokens` table. Raw token is `secrets.token_urlsafe(32)`; only the SHA-256 hash is stored. Previous unused tokens for the same `(user_id, token_type)` are deleted before issuing a new one. Every consumer endpoint validates `used_at IS NULL` and `expires_at > NOW()` (UTC) and stamps `used_at = NOW()` on success.
- **`token_type` values** — `verify_email` (24h), `password_reset` (1h, revokes all refresh tokens on use), `email_change` (24h, metadata stores `{new_email}`, confirmation link sent to the NEW address), `email_revert` (14d, metadata stores `{old_email, new_email}`, confirmation link sent to the OLD address). `email_tokens.metadata` is a JSONB column used by the change/revert types.
- **Email change flow** — `request-email-change` requires the current password and rejects emails already in use. `confirm-email-change` updates `users.email` + sets `email_verified=TRUE`, catches `UniqueViolation` (returns 409), then issues an `email_revert` token and emails both addresses (revert link to old, confirmation to new). `revert-email-change` restores the old email and revokes all refresh tokens.
- **Per-endpoint rate limits** — `send-verification-email` / `forgot-password` / `request-email-change` / `confirm-email-change` / `revert-email-change`: `3 per hour; 5 per day`. `verify-email`: `10 per hour`. `reset-password`: `5 per hour; 10 per day`.
- **Generic responses** — `forgot-password` always returns the same success message regardless of whether the email exists (prevents account enumeration).
- **`RESEND_EMAIL_FRONTEND_URL`** — Env var used to build all email links (e.g., `${RESEND_EMAIL_FRONTEND_URL}/verify-email?token=...`, `/reset-password`, `/confirm-email-change`, `/revert-email-change`). Read once at import in both `routes/email.py` and `services/email_service.py` into a module-level constant of the same name.

## Input Validators (`utils/auth_helpers.py`)
Use these for any user-facing auth/profile input. They return `None` if valid, an error string otherwise (except `validate_and_normalize_email`, which returns the normalized email or `None`).
- `validate_username` — 3–12 chars, `[a-zA-Z0-9_-]` only.
- `validate_display_name` — required, max 30 chars.
- `validate_and_normalize_email` — uses `email_validator` (no deliverability check); returns the canonical normalized form.
- `validate_password` — 8–128 chars (upper bound prevents bcrypt-cost-12 DoS via huge payloads).

## Date/Time Conventions (`utils/dates.py`)
- **Game-day helpers** (which puzzle, history day and streak day it is): `get_today_now()`, `get_today_date()`, `get_today_date_str()` (ISO `YYYY-MM-DD`). Anchored to `America/New_York`; the daily reset is midnight there.
- **Real-time helpers** (never offset): `utc_now()` for token/session timestamps and every `email_tokens` / `refresh_tokens` expiry; `est_now()` / `get_current_timestamp()` for real New York moments (`created_at`, `won_at`, transfer-code expiry).
- **`TEST_MODE`** — With `FLASK_ENV=development`, `TEST_DATE_OFFSET` shifts only the game-day helpers by that many days; tokens and expiries keep the real clock. Production ignores it.

## Frontend Auth Layer (`kpopit-frontend/src/`)
- **`contexts/AuthProvider.tsx` + `contexts/auth_context.ts`** — `AuthProvider` is mounted at the app root and exposes `{ isAuthenticated, isLoading, user, refreshAuth }` via `AuthContext`. On mount it attempts a silent refresh via `/auth/refresh` → `/auth/me` if a session marker exists.
- **`hooks/useAuth.ts`** — Consumer hook; throws if used outside `<AuthProvider>`.
- **`services/tokenStore.ts`** — Module-level `accessToken` variable (`get/set/clearAccessToken`). The JWT access token is held in JS memory only; it is NEVER written to localStorage/sessionStorage.
- **Session markers (localStorage / sessionStorage)**
  - `kpopit_session` — Presence indicates a real (authenticated) session should be restored. Login writes this to `localStorage` (remember-me) or `sessionStorage` (session-only). Its absence short-circuits `restoreSession` so anonymous users don't hit `/auth/refresh`.
  - `kpopit_was_authenticated` — Sticky `localStorage` flag that distinguishes "lost an authenticated session" from "anonymous user whose refresh just failed". Only when set do we wipe `userToken` + game state on session loss; pure anonymous users keep their UUID and local progress.
- **`services/api.ts` interceptors**
  - Request: attaches `Authorization: Bearer <jwt>` from `tokenStore` to every non-`/auth/refresh` call; injects `gamemode_id` query param for non-`/auth` routes.
  - Response: on 401 (except `/auth/login|register|claim|refresh`), performs a single retry through `refreshToken()` then replays the request. The `refreshToken()` helper deduplicates concurrent calls via an `inFlightRefresh` promise so parallel 401s share one refresh.
  - On `400 "Invalid user token"` it clears localStorage and reloads; on `"Game date mismatch"` it reloads.
- **Anonymous-compatible game endpoints** — `getDailyIdol` and `getBlurryDailyIdol` decrypt the localStorage UUID and pass it as a bare `Authorization` header, overriding any JWT — this keeps the endpoints reachable for fully anonymous users.

## Key Environment Variables

### Frontend (`.env`)
| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base URL |
| `VITE_IMAGE_BUCKET_URL` | Cloudflare R2 CDN for idol images |
| `VITE_ENCRYPTION_KEY` | AES key for localStorage token encryption |
| `VITE_ADMIN_ENABLED` | Enables `/admin` route |
| `VITE_MAINTENANCE_MODE` | Redirects all traffic to maintenance page |
| `VITE_COLLECTION_ENABLED` | Mounts the `/collections` routes and NavBar entry; gates the `CardGrantedReveal` win-celebration slot |
| `PRERENDER_API_URL` | Build time only (not `VITE_`): API the prerender reads the idol list/profiles from. Default `http://127.0.0.1:5000` (local seeded backend); production API only on Vercel |

### Backend (`.env`)
| Variable | Purpose |
|---|---|
| `DB_URL` | PostgreSQL connection string |
| `FRONTEND_URL` | Comma-separated CORS allowlist |
| `ADMIN_ENABLED` | Enables admin blueprint |
| `MAINTENANCE_MODE` | Disables all `/api` routes |
| `COLLECTION_ENABLED` | Registers `collection_bp` and enables the win→card grant hook (Album 1 collection) |
| `R2_*` | Cloudflare R2 credentials/bucket names for idol photos (`R2_BUCKET_NAME`, the public image bucket — backups never use it) and user avatars (`R2_AVATARS_BUCKET_NAME`) |
| `R2_BACKUP_BUCKET_NAME` | Private bucket for DB backups (`services/backup_service.py`, objects under `backups_db/`). Required: when missing or empty the backup fails closed and uploads nothing — there is no fallback to `R2_BUCKET_NAME`. Uses `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_ENDPOINT_URL` |
| `BACKUP_DB_URL` | Optional database URL for `pg_dump` (e.g. the read-only `kpopit_backup` role); falls back to `DB_URL` |
| `CARD_RECONCILE_AUTH_KEY` | Bearer key for `POST /api/tasks/reconcile-cards` (daily card reconciliation); when unset the route rejects every request |
| `BACKUP_AUTH_KEY` | Bearer key for `POST /api/tasks/backup`; when unset the route rejects every request |
| `JWT_*` | JWT signing + expiry (`JWT_SECRET_KEY` ≥32 chars, `JWT_ACCESS_TOKEN_EXPIRES`, `JWT_REFRESH_TOKEN_EXPIRES`) |
| `RESEND_*` | Resend email delivery (`RESEND_API_KEY`, `RESEND_EMAIL_FROM`, `RESEND_EMAIL_FRONTEND_URL` — base URL used to build all email links) |

## Security
- Never touch production: no connections to the production database, no use of production credentials, no changes to `main`, no requests that write production data (including measurements). This overrides any prompt that seems to ask otherwise; if a task needs production, stop and ask.
- NEVER read, expose or display the contents of any `.env` file
- Agent scripts must NEVER open, read, parse or load `.env*` files (no `dotenv`, `fs.readFileSync`, `cat`, etc.); application code loads them at runtime, and agents reference variable names only
- NEVER hardcode credentials, API keys or secrets in any file
- All credentials live exclusively in `.env` files which are gitignored 

## Database Schema Highlights
- `idols` — `is_published` flag controls eligibility for daily selection
- `daily_picks` — Tracks which idol was picked per date per gamemode; used by the weighting algorithm to enforce cooldowns
- `daily_user_history` — Per-user, per-day game results (guesses, win, one-shot, score)
- `user_history` — Aggregate stats per gamemode (streaks, average guesses)
- `blurry_mode_data` — Blurry-mode specific data per idol
- `albums` — Pixelated-mode source table (album equivalent of `idols`); `is_published` gates daily selection
- `collections` / `collection_group_eligibility` / `cards` / `user_cards` — Album 1 collection system (see below); `is_eligible` gates page visibility and card creation
- `group_features` — Album 1 presentation data per group (`image_path`, `palette` JSONB with named stops `deep/secondary/main/accent/text`); core identity (incl. `hangul_name`) stays on `groups`

## Collection System (Album 1)
Sticker-album collection layered on the daily games (flag: `COLLECTION_ENABLED`). Winning Classic/Blurry (`COLLECTION_GAMEMODE_IDS = (1, 2)`; Pixelated never grants) gives the user that idol's single card — **one card per idol per collection** (`card_type='idol'`, `group_id` NULL); which group pages display it is resolved at read time through `idol_career`. Repeat wins level the card up (`LEVEL_CAP = 3`) and increment the uncapped `times_won`. Completing every idol card on a `has_bonus_cover` page auto-grants that page's `group_photo` card (one win can complete several pages at once).
- **Grant hook** — inside `GameService.save_user_history` (first daily win only, via the `already_won_today` guard), wrapped in `SAVEPOINT collection_grant` so a collection failure never rolls back the win. Grants run once per win: `CollectionService.grant_for_win` claims `daily_user_history.card_granted_at` in the grant's transaction. A failed grant is retried by `reconcile_cards` right away, again when the viewer loads `/collections/list`, and daily by `POST /api/tasks/reconcile-cards` (`.github/workflows/reconcile-cards.yml`). Returns `(is_correct, card_granted)`; Classic/Blurry guess responses carry `card_granted: {card_id, is_new, level, times_won, group_photo: [group_id]} | null`.
- **Card numbering** — Each idol card carries a contiguous per-collection `card_number` (`1..N`, one per idol) computed at **read time** via `DENSE_RANK() OVER (ORDER BY idol_id)` in the member query — no schema column, no migration. It's append-only and shared: a multi-group idol shows the same number on every page. Group-photo cards are never numbered (`Reward` label). Threaded through `albumMapper.ts` → `AlbumMembersPage` (locked + owned slots) + `CardZoomModal` (`Card #N`).
- **Reads** — `routes/collections/collections.py`: `GET /api/collections/list` (per-collection rows with distinct `total_cards`/`owned_cards` for the collections list page) and `GET /api/collections/album/<collection_id>` (bulk payload for the flip-book: every eligible group with `hangul_name`, `debut_year`, `fandom_name`, `company`/`label` from `group_company_affiliation`+`companies` (label falls back to the Label company when no Parent Company row), `group_features` `image_path`/`palette`, member roster with ownership, `group_photo`; unknown collection → 404). All `@optional_auth`; anonymous UUIDs resolve via `resolve_user_id`. Card art falls back via `COALESCE` — idol cards to `idols.image_path`, group_photo cards to `group_features.image_path`. (The old `/overview` + `/groups/<id>` reads were removed 2026-07-18 — consumerless after the flip-book design.)
- **Seeding** — `collections` + `collection_group_eligibility` come from CSVs via `seed_db.py`; the derived card catalog from `seed_collection_cards.py` (publish flow: flip `is_eligible` in the CSV → `seed_db.py` → `seed_collection_cards.py`). `group_features.csv` is generated by `generate_group_features_csv.py` (5-stop named palette via `generate_group_palette.py`, which splits the five stops across the 1–5 hex colors declared for a group — first color wins `main` and the largest share, the rest sort darkest→lightest into deep/secondary/accent/light). `backfill_collection_cards.py` replays historical wins once before launch (runbook in its header).
- **Frontend** — `/collections` is the collections *list* page (`pages/Collection/Collections.tsx`; the old `/collection` path is not a route — it falls to the catch-all and goes home). The album lives at `/collections/:collectionId/:slug` (`CollectionAlbum.tsx`): the flip-book engine (`components/Albums/AlbumOfCol/AlbumOfCol.tsx`, folders `pages/`/`shell/`/`cards/`; layout constants + `COVER_PALETTE` in `albumConstants.ts`) mounted `chromeless` inside the album-page chrome — top bar, collapsible Summary rail (`AlbumPageIndex`), side arrows, bottom mini-page carousel (`AlbumPageCarousel`), info modal (`AlbumInfoModal`), mobile index modal + rotate hint — driven through `controlRef`/`onPosChange`/`onBookInit`. Both collection pages share the persisted night mode (`useCollectionNight`, key `kpopit-collections-night`), `useQuery(["collectionAlbum", id], () => getCollectionAlbum(id))` + the shared `albumMapper.ts`. Collection types live in `interfaces/albumInterfaces.ts`. Card levels: LV1 group-color frame, LV2 gold, LV3 animated holo (`AlbumMemberCard`). Winning Classic/Blurry shows `CardGrantedReveal` (from the guess response's `card_granted`) and invalidates both `["collectionAlbum"]` and `["collectionsList"]` (only when `card_granted` is non-null). Album interactions: **tap-to-zoom** a card (`CardZoomModal`, animated flight to/from its slot), a mobile-only **Focus mode** (reads one page at a time; shares a synchronous navigation lock with leaf turns so rapid input can't desync), and an **FX settings panel** (`data-fx-*` attribute-driven — sparkles, etc. — never props that re-render the book). The carousel lazy-mounts thumbnails via `IntersectionObserver` windowing + preview-gated shell chrome (measured ~84% DOM-node reduction on load). A one-shot DevTools **console easter egg** (`utils/consoleEasterEgg.ts`) prints once per browser session from `app/root.tsx`.

## Code Conventions
Recurring patterns across the codebase — follow them in new code.

**Backend**
- **Thin routes, service-owned logic** — Route handlers acquire `get_db()` + a cursor, wrap the body in `try/finally: cursor.close()`, and delegate to a Service class (`AlbumService`, `GameService`, `UserService`). Services receive `connect`/`cursor` as arguments and never call `get_db()` themselves.
- **Pooled, dict-row connections** — `get_db()` returns a request-scoped connection from the shared `ConnectionPool` (stored on `flask.g`); `row_factory=dict_row` is set pool-wide, so rows are accessed by key (`row["album_id"]`). Teardown rolls back and returns the connection to the pool.
- **Roll back on error** — On any exception mid-transaction use `connect.rollback()` (never leave a transaction open; the pool enforces `idle_in_transaction_session_timeout`). Services re-raise after rolling back; teardown rolls back defensively.
- **Reads before the write/commit** — Run all `SELECT`s before the mutating call. `process_guess` fetches the answer payload and guessed album first, then delegates to `save_user_history`, which owns the upsert + the single `commit()`.
- **Defensively normalize external input** — `request.get_json() or {}`, `get_analytics_data() or {}` before use.

**Frontend**
- **Gate debug logs behind `import.meta.env.DEV`** — Standard across `api.ts`, `tokenEncryption.ts`, `AuthProvider.tsx`, Classic/Blurry pages. (`PixelatedMode.tsx` still logs raw — the current exception.)
- **Selective localStorage removal, never a blind wipe** — Per-mode key lists in `useClearGameStorage` (`CLASSIC_KEYS` / `BLURRY_KEYS` / `PIXELATED_KEYS`) removed key-by-key on new-day detection. The one deliberate `localStorage.clear()` (invalid-token reset in `api.ts`) still re-preserves `kpopit_session` + `kpopit_was_authenticated`.
- **Reload via `safeReload()`** — Not `window.location.reload()` directly; its one-shot guard prevents reload loops when multiple triggers fire.
- **Per-mode React Query keys** — `["pixelatedDailyAlbum", gameMode]`, `["dailyUserCount", gameMode]`, etc. Client-side search lists (`["allAlbums"]`, `["allIdols"]`) are fetched once and filtered locally — no per-keystroke endpoint.

### Comments
- Inline comments: 1–2 lines, explaining why (not what the code says).
- Longer explanations (docstrings, module headers, non-obvious workarounds): 3–5 lines max. Anything longer belongs in docs.
- No dead commented-out code, no references to local/gitignored docs (e.g. "plan §3"), no `noqa`/`pragma`/`eslint-disable` to hide a
  problem: fix the cause. If a suppression is truly unavoidable, one line saying why.
- Keep on purpose: labeled testing toggles (e.g. the commented `idol_id = 1` / album override in the daily routes, used to force a
  pick while testing) and usage examples in helpers (e.g. the `utils/dates.py` examples). Don't strip them in cleanups.

## Architecture — Adding a New Game Mode
Every mode follows the same shape (Classic → Blurry → Pixelated) on both stacks. Reuse it; don't invent a parallel structure. (Visual/design rules live in `kpopit-frontend/DESIGN.md` — Puff Pop style; exact tokens, components and the reference UI kit live in the design system at `docs/design-system/`, which wins on any value conflict.)

> **Design scope is a baseline, not a hard rule.** `kpopit-frontend/DESIGN.md` is the default visual language, but individual features may intentionally diverge from it (e.g. an album view with a look of its own). When the user asks to change the scope or explore a new visual direction for a feature, follow their new direction — don't force it back to DESIGN.md — and update DESIGN.md if they want the change to become the new baseline.

### Backend
- **Blueprint + `gamemode_id`** — Add `routes/games/<mode>.py`, register it under `/api` in `app.py`, and assign the next `gamemode_id`. The active mode is read per-request into `g.gamemode_id` from the `gamemode_id` query param (`load_gamemode` in `app.py`, defaults to 1).
- **A Service owns the mode's logic** — Put it in `services/<x>_service.py` (e.g. `AlbumService`), constructed with the connection and given `cursor`/`connect` per call. It provides three things:
  1. **Daily pick** — add the mode to `_MODES` in `services/daily_draw.py` (eligible items + entry date) and call `ensure_daily_picks`; it writes to `daily_picks` keyed by `(pick_date, gamemode_id)`.
  2. **Daily fetch** — return only what the client needs to render/play (no answer-revealing extras beyond what the UI already uses as hints).
  3. **`process_guess`** — resolve the correct answer, then **delegate persistence** (see below).
- **Scoring is centralized — never reimplemented per mode** — `process_guess` delegates to `GameService.save_user_history`, the single owner of the `daily_user_history` upsert, `score`, `user_history` streaks/aggregates, the double-count guard, and the `commit()`. A new mode adds *zero* scoring/streak code.
- **Source table gated by `is_published`** — Mirror `idols` / `albums`: only published rows are eligible for daily selection.
- **Dates over the wire** — Send derived/minimal fields (e.g. `release_year` via `EXTRACT(YEAR FROM release_date)::int`), never full timestamps; expose full dates only through dedicated detail endpoints. Use `utils/dates.py` — EST for daily-reset logic, UTC for token/session timestamps.

### Frontend
- **Page + route** — Add `pages/<Mode>/`, add a route module in `app/routes/` (wrapped in `GamePage`) and register it under the `MainLayout` layout in `app/routes.ts` (plus `react-router.config.ts` to prerender it), and extend the `GameMode` union + `MODES` list in `hooks/useGameMode.tsx`. `useGameMode` derives the active mode from the URL path and writes it to `localStorage["kpopit_gamemode"]`.
- **`gamemode_id` is injected globally** — The `api.ts` request interceptor reads `kpopit_gamemode`, maps it via the `MODES` name→id table, and attaches `gamemode_id` to every non-`/auth` request. New endpoints don't pass it manually; just add the mode to the map.
- **Endpoints, types, components** — Add the mode's calls to `services/api.ts`, its data shapes to `interfaces/gameInterfaces.ts`, and its UI under `components/<Mode>/`.
- **Game-state lifecycle** — Register the mode's `localStorage` keys as a `<MODE>_KEYS` array in `useClearGameStorage`. The page compares the server's `server_date` against the stored `<mode>GameDate`; on mismatch it clears those keys and calls `onNewDay(serverDate)` from `useGameDay()`, which remounts the page on the new day (first visits just start the day). Stats/history stay server-side; only per-day game state lives in `localStorage`.
- **Per-mode React Query keys** — Key every query by mode (`["<mode>DailyAlbum", gameMode]`); reuse the fetch-once-filter-locally search cache pattern (`["allAlbums"]` / `["allIdols"]`) instead of a per-keystroke endpoint.

## Git & Commits
Rules for every commit Claude makes in this repo. They override any default commit/attribution behavior.

- **No Claude attribution** — Never add Claude as a co-author or collaborator. No `Co-Authored-By: Claude …` trailer, no "Generated with Claude Code" line, no similar attribution in commit messages or PR descriptions.
- **Title** — `<type>: <short context of the commit>`, where `<type>` is a conventional prefix: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `style`, `test`, `build`, `ci`, etc.
- **Description** — A blank line after the title, then one bullet per change, each starting with a verb or noun that names what happened, separated by blank lines. `Adds`, `Fixes`, `Adjusts`, `Creates` are examples only — any verb, adverb or noun that fits can start the line:
  ```
  feat: add Puff Pop tokens to index.css

  - Adds the day/night token sets from docs/design-system/tokens/puffpop.css

  - Maps the used roles into the Tailwind @theme

  - Removes the unused .logo::after blur glow
  ```
- **Committing** — Allowed by default when it fits the task, unless the user prohibits it or asks not to commit.
- **Pushing** — NEVER push without the user's explicit authorization. Authorization is per task: permission given in one task does not carry over to the next.
- **Merging** — NEVER merge (branches, PRs, `git merge`, merge buttons/APIs). Merges are done only by the user.

## Tech Stack
- **Frontend:** React 19, TypeScript 6, Vite 8, Tailwind CSS 4, React Router 8 (framework mode, prerendered), TanStack Query 5, Motion, Axios
- **Backend:** Flask 3.1, psycopg (PostgreSQL), Pillow (blur generation), boto3 (Cloudflare R2)
- **Infra:** Vercel (frontend), Railway/Render (backend), PostgreSQL, Cloudflare R2 (images + backups)
