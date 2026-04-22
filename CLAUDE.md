# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**KpopIt** is a Wordle-inspired daily K-pop idol guessing game. Users guess a randomly selected idol each day by comparing attributes (Classic Mode) or identifying an increasingly unblurred photo (Blurry Mode). All users worldwide share the same daily idol, resetting at midnight EST.

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
2. On game load, frontend fetches the daily idol challenge — Classic: `GET /api/game/classic/daily-idol`, Blurry: `GET /api/game/blurry/daily-idol`
3. User guesses are submitted and the backend returns per-attribute feedback (`correct`, `partial`, `higher`, `lower`, `incorrect`)
4. Game state (guesses, completion, hints revealed) is persisted in localStorage and cleared on new day detection
5. All stats and history are stored server-side in PostgreSQL, keyed by user token

### Backend (`kpopit-backend/`)
- **`app.py`** — Flask entry point; registers 9 blueprints, handles CORS and maintenance mode
- **`routes/games/`** — Game endpoints for classic and blurry modes; all support `gamemode_id` query param (1=classic, 2=blurry)
- **`services/`** — Business logic layer: `idol_service.py` runs the exponential-weighted daily pick algorithm (cooldown: 10 days, weight: `A * exp(K * days_waiting)` where K=0.08); `game_service.py` handles streaks and scoring
- **`repositories/`** — Data access layer over PostgreSQL
- **`utils/game_feedback_logic.py`** — Feedback comparison engine (exact match, partial group match, higher/lower for numerical fields)
- **`utils/dates.py`** — All daily reset logic is EST-anchored

### Frontend (`kpopit-frontend/src/`)
- **`main.tsx`** — App entry; React Router v7 with nested routes; admin and maintenance routes gated by env vars
- **`hooks/useSharedGameData.tsx`** — Core state hook; owns the localStorage game state lifecycle (reads on load, clears on new day, triggers page reload)
- **`hooks/`** — `useGameMode`, `useResetTimer`, `useIdolSearch`, `useTransferDataLogic`
- **`services/api.ts`** — Axios client; attaches decrypted user token to every request via interceptor
- **`pages/`** — `ClassicMode/`, `BlurryMode/`, `Idols/` (list + `/:id/:slug` profile), `Home/`, `admin/`
- **`interfaces/gameInterfaces.ts`** — Central TypeScript type definitions for all game data shapes
- **`utils/tokenEncryption.ts`** — AES encryption/decryption for localStorage token storage

### State Management
- **React Query (TanStack Query)** — All server state; `["allIdols"]` cached for 5+ days, `["userStats", token]` per-user
- **localStorage** — Game state per mode: `GuessedIdols`, `todayGuessesDetails`, `gameComplete`, `gameWon`, `hint1Revealed`, `hint2Revealed`, plus `{mode}_lastPlayedDate` for day-change detection
- No React Context — React Query replaces global state needs

## Authentication
- **Auth approach** — Optional JWT layer on top of the anonymous UUID flow. Access token (1h) lives in React memory; refresh token (30d) is an httpOnly cookie scoped to `/api/auth`; anonymous UUID stays in encrypted localStorage for users who never sign up. `Authorization` header accepts either `Bearer <jwt>` (authenticated) or a bare UUID (anonymous) — all existing game routes keep working with both via `@optional_auth`.
- **Endpoints** — All under `/api/auth/`: `register`, `login`, `logout`, `refresh`, `me`, `claim` (upgrades an anonymous UUID into a real account without losing history — `users.id` never changes), `forgot`, `reset`
- **Rate limiting** — Flask-Limiter keyed per client IP (via `ProxyFix(x_for=1)` on `app.wsgi_app`), in-memory storage. Limits per route: `forgot` 3/min, `register`/`claim`/`reset` 5/min, `login` 10/min, `refresh` 30/min. A custom `RateLimitExceeded` handler returns JSON 429 and preserves the `Retry-After` header (exposed through CORS so the frontend can read it).
- **New files**
  - `routes/auth.py` — all `/api/auth/*` endpoints with `@limiter.limit` decorators
  - `services/auth_service.py` — bcrypt (cost 12), JWT encode/decode, register/login/claim/reset flows
  - `repositories/user_repository.py` — all auth + profile DB queries
  - `utils/auth_helpers.py` — `detect_user()` (UUID vs JWT), `decode_jwt()` (HS256-pinned, `type` claim validated), input validators
  - `utils/auth_decorators.py` — `@optional_auth`, `@require_auth`, `@require_admin`
  - `utils/rate_limiter.py` — shared `Limiter` instance, `init_app`'d from `app.py`
- **New tables** — `user_profiles` (display_name, avatar_url), `refresh_tokens` (SHA-256 hashed, revocable on logout/reset), `password_reset_tokens` (SHA-256 hashed, single-use, 1h TTL)

## Key Environment Variables

### Frontend (`.env`)
| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base URL |
| `VITE_IMAGE_BUCKET_URL` | Cloudflare R2 CDN for idol images |
| `VITE_ENCRYPTION_KEY` | AES key for localStorage token encryption |
| `VITE_ADMIN_ENABLED` | Enables `/admin` route |
| `VITE_MAINTENANCE_MODE` | Redirects all traffic to maintenance page |

### Backend (`.env`)
| Variable | Purpose |
|---|---|
| `DB_URL` | PostgreSQL connection string |
| `FRONTEND_URL` | Comma-separated CORS allowlist |
| `ADMIN_ENABLED` | Enables admin blueprint |
| `MAINTENANCE_MODE` | Disables all `/api` routes |
| `R2_*` | Cloudflare R2 credentials for idol photo storage and DB backups |

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

## Tech Stack
- **Frontend:** React 19, TypeScript 5.8, Vite 7, Tailwind CSS 4, Chakra UI, React Router 7, TanStack Query 5, Framer Motion, Axios
- **Backend:** Flask 3.1, psycopg (PostgreSQL), Pillow (blur generation), boto3 (Cloudflare R2)
- **Infra:** Vercel (frontend), Railway/Render (backend), PostgreSQL, Cloudflare R2 (images + backups)
