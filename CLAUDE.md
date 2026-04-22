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
