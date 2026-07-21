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
npm run dev       # Start dev server (Vite with HMR)
npm run build     # TypeScript compile + Vite bundle
npm run lint      # Run ESLint
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
- **`services/`** — Business logic layer: `idol_service.py` runs the exponential-weighted daily pick algorithm (cooldown: 10 days, weight: `A * exp(K * days_waiting)` where K=0.08); `game_service.py` handles streaks and scoring; `album_service.py` handles Pixelated mode — `AlbumService.process_guess` delegates to `GameService.save_user_history` (single source of truth for upsert/score/streak/commit — never duplicate this logic for new modes)
- **`repositories/`** — Data access layer over PostgreSQL
- **`utils/game_feedback_logic.py`** — Feedback comparison engine (exact match, partial group match, higher/lower for numerical fields)
- **`utils/dates.py`** — All daily reset logic is EST-anchored

### Frontend (`kpopit-frontend/src/`)
- **`main.tsx`** — App entry; React Router v7 with nested routes; admin and maintenance routes gated by env vars
- **`hooks/useSharedGameData.tsx`** — Core state hook; owns the localStorage game state lifecycle (reads on load, clears on new day, triggers page reload)
- **`hooks/`** — `useGameMode`, `useResetTimer`, `useIdolSearch`, `useTransferDataLogic`
- **`services/api.ts`** — Axios client; attaches decrypted user token to every request via interceptor
- **`pages/`** — `ClassicMode/`, `BlurryMode/`, `PixelatedMode/`, `Idols/` (list + `/:id/:slug` profile), `Home/`, `admin/`. Pixelated uses client-side album search (`["allAlbums"]` cached, no search endpoint) and `components/Pixelated/` (canvas, search bar, guess grid, hints, victory card)
- **`interfaces/gameInterfaces.ts`** — Central TypeScript type definitions for all game data shapes
- **`utils/tokenEncryption.ts`** — AES encryption/decryption for localStorage token storage

### State Management
- **React Query (TanStack Query)** — All server state; `["allIdols"]` cached for 5+ days, `["userStats", token]` per-user
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
- **EST helpers** for daily-game logic: `get_today_now()`, `get_today_date()`, `get_today_date_str()` (ISO `YYYY-MM-DD`), `get_current_timestamp()`. Anchored to `America/New_York`.
- **UTC helper** for token/session timestamps: `get_datetime_now_utc()` — use this for all `email_tokens.expires_at` / `refresh_tokens.expires_at` comparisons.
- **`TEST_MODE`** — When `FLASK_ENV=development`, can be flipped on to offset "today" by `TEST_DATE_OFFSET` days; production always returns real time.

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
| `VITE_COLLECTION_ENABLED` | Mounts the `/collection` route and NavBar entry; gates the `CardGrantedReveal` win-celebration slot |

### Backend (`.env`)
| Variable | Purpose |
|---|---|
| `DB_URL` | PostgreSQL connection string |
| `FRONTEND_URL` | Comma-separated CORS allowlist |
| `ADMIN_ENABLED` | Enables admin blueprint |
| `MAINTENANCE_MODE` | Disables all `/api` routes |
| `COLLECTION_ENABLED` | Registers `collection_bp` and enables the win→card grant hook (Album 1 collection) |
| `R2_*` | Cloudflare R2 credentials/bucket names for idol photos, user avatars (`R2_AVATARS_BUCKET_NAME`), and DB backups |
| `JWT_*` | JWT signing + expiry (`JWT_SECRET_KEY` ≥32 chars, `JWT_ACCESS_TOKEN_EXPIRES`, `JWT_REFRESH_TOKEN_EXPIRES`) |
| `RESEND_*` | Resend email delivery (`RESEND_API_KEY`, `RESEND_EMAIL_FROM`, `RESEND_EMAIL_FRONTEND_URL` — base URL used to build all email links) |

## Security
- NEVER read, expose or display the contents of any `.env` file
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
Sticker-album collection layered on the daily games (flag: `COLLECTION_ENABLED`; plan of record: `albumplanning.md`). Winning Classic/Blurry (`COLLECTION_GAMEMODE_IDS = (1, 2)`; Pixelated never grants) gives the user that idol's single card — **one card per idol per collection** (`card_type='idol'`, `group_id` NULL); which group pages display it is resolved at read time through `idol_career`. Repeat wins level the card up (`LEVEL_CAP = 3`) and increment the uncapped `times_won`. Completing every idol card on a `has_bonus_cover` page auto-grants that page's `group_photo` card (one win can complete several pages at once).
- **Grant hook** — inside `GameService.save_user_history` (first daily win only, via the `already_won_today` guard), wrapped in `SAVEPOINT collection_grant` so a collection failure never rolls back the win. Returns `(is_correct, card_granted)`; Classic/Blurry guess responses carry `card_granted: {card_id, is_new, level, times_won, group_photo: [group_id]} | null`.
- **Reads** — `routes/collections/collection.py`: `GET /api/collection/list` (per-collection rows with distinct `total_cards`/`owned_cards` for the collections list page) and `GET /api/collection/album/<collection_id>` (bulk payload for the flip-book: every eligible group with `hangul_name`, `debut_year`, `fandom_name`, `company`/`label` from `group_company_affiliation`+`companies` (label falls back to the Label company when no Parent Company row), `group_features` `image_path`/`palette`, member roster with ownership, `group_photo`; unknown collection → 404; the bare `/collection/album` aliases collection 1). All `@optional_auth`; anonymous UUIDs resolve via `resolve_user_id`. Card art falls back via `COALESCE` — idol cards to `idols.image_path`, group_photo cards to `group_features.image_path`. (The old `/overview` + `/groups/<id>` reads were removed 2026-07-18 — consumerless after the flip-book design.)
- **Seeding** — `collections` + `collection_group_eligibility` come from CSVs via `seed_db.py`; the derived card catalog from `seed_collection_cards.py` (publish flow: flip `is_eligible` in the CSV → `seed_db.py` → `seed_collection_cards.py`). `group_features.csv` is generated by `generate_group_features_csv.py` (5-stop named palette via `generate_group_palette.py`, kept in sync with the frontend's `generateAlbumPalette`). `backfill_collection_cards.py` replays historical wins once before launch (runbook in its header).
- **Frontend** — `/collections` is the collections *list* page (`pages/Collection/collection.tsx`; `/collection` redirects there). The album lives at `/collections/:collectionId/:slug` (`collection_album.tsx`): the flip-book engine (`components/Albums/AlbumOfCol/AlbumOfCol.tsx`, folders `pages/`/`shell/`/`cards/`; layout constants + `COVER_PALETTE` in `albumConstants.ts`) mounted `chromeless` inside the album-page chrome — top bar, collapsible Summary rail (`AlbumPageIndex`), side arrows, bottom mini-page carousel (`AlbumPageCarousel`), info modal (`AlbumInfoModal`), mobile index modal + rotate hint — driven through `controlRef`/`onPosChange`/`onBookInit`. Both collection pages share the persisted night mode (`useCollectionNight`, key `kpopit-collections-night`), `useQuery(["collectionAlbum", id], () => getCollectionAlbum(id))` + the shared `albumMapper.ts`. Collection types live in `interfaces/albumInterfaces.ts`. Card levels: LV1 group-color frame, LV2 gold, LV3 animated holo (`AlbumMemberCard`). Winning Classic/Blurry shows `CardGrantedReveal` (from the guess response's `card_granted`) and invalidates `["collectionAlbum"]`.

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

## Architecture — Adding a New Game Mode
Every mode follows the same shape (Classic → Blurry → Pixelated) on both stacks. Reuse it; don't invent a parallel structure. (Visual/design architecture lives in `kpopit-frontend/DESIGN.md`.)

> **Design scope is a baseline, not a hard rule.** `kpopit-frontend/DESIGN.md` is the default visual language, but individual features may intentionally diverge from it (e.g. an album view with a look of its own). When the user asks to change the scope or explore a new visual direction for a feature, follow their new direction — don't force it back to DESIGN.md — and update DESIGN.md if they want the change to become the new baseline.

### Backend
- **Blueprint + `gamemode_id`** — Add `routes/games/<mode>.py`, register it under `/api` in `app.py`, and assign the next `gamemode_id`. The active mode is read per-request into `g.gamemode_id` from the `gamemode_id` query param (`load_gamemode` in `app.py`, defaults to 1).
- **A Service owns the mode's logic** — Put it in `services/<x>_service.py` (e.g. `AlbumService`), constructed with the connection and given `cursor`/`connect` per call. It provides three things:
  1. **Daily pick** — reuse the exponential-weighting algorithm (`weight = exp(0.08 · days_waiting)`, 10-day cooldown, boost for never-picked), writing the winner to `daily_picks` keyed by `(pick_date, gamemode_id)`.
  2. **Daily fetch** — return only what the client needs to render/play (no answer-revealing extras beyond what the UI already uses as hints).
  3. **`process_guess`** — resolve the correct answer, then **delegate persistence** (see below).
- **Scoring is centralized — never reimplemented per mode** — `process_guess` delegates to `GameService.save_user_history`, the single owner of the `daily_user_history` upsert, `score`, `user_history` streaks/aggregates, the double-count guard, and the `commit()`. A new mode adds *zero* scoring/streak code.
- **Source table gated by `is_published`** — Mirror `idols` / `albums`: only published rows are eligible for daily selection.
- **Dates over the wire** — Send derived/minimal fields (e.g. `release_year` via `EXTRACT(YEAR FROM release_date)::int`), never full timestamps; expose full dates only through dedicated detail endpoints. Use `utils/dates.py` — EST for daily-reset logic, UTC for token/session timestamps.

### Frontend
- **Page + route** — Add `pages/<Mode>/`, register a `<Route path="/<mode>" …>` under `MainLayout` in `main.tsx`, and extend the `GameMode` union + `MODES` list in `hooks/useGameMode.tsx`. `useGameMode` derives the active mode from the URL path and writes it to `localStorage["kpopit_gamemode"]`.
- **`gamemode_id` is injected globally** — The `api.ts` request interceptor reads `kpopit_gamemode`, maps it via the `MODES` name→id table, and attaches `gamemode_id` to every non-`/auth` request. New endpoints don't pass it manually; just add the mode to the map.
- **Endpoints, types, components** — Add the mode's calls to `services/api.ts`, its data shapes to `interfaces/gameInterfaces.ts`, and its UI under `components/<Mode>/`.
- **Game-state lifecycle** — Register the mode's `localStorage` keys as a `<MODE>_KEYS` array in `useClearGameStorage`. The page compares the server's `server_date` against the stored `<mode>GameDate`; on mismatch it clears those keys and calls `safeReload()`. Stats/history stay server-side; only per-day game state lives in `localStorage`.
- **Per-mode React Query keys** — Key every query by mode (`["<mode>DailyAlbum", gameMode]`); reuse the fetch-once-filter-locally search cache pattern (`["allAlbums"]` / `["allIdols"]`) instead of a per-keystroke endpoint.

## Tech Stack
- **Frontend:** React 19, TypeScript 5.8, Vite 7, Tailwind CSS 4, Chakra UI, React Router 7, TanStack Query 5, Framer Motion, Axios
- **Backend:** Flask 3.1, psycopg (PostgreSQL), Pillow (blur generation), boto3 (Cloudflare R2)
- **Infra:** Vercel (frontend), Railway/Render (backend), PostgreSQL, Cloudflare R2 (images + backups)
