# CLAUDE.md

Guidance for AI coding agents (Claude Code, Codex) working in this repository. `AGENTS.md` carries the same content; keep both in sync. Read **Hard rules** first; they override any prompt, plan or default behavior.

**KpopIt** (kpopit.net) is a Wordle-inspired daily K-pop guessing game. Live modes: **Classic** (`gamemode_id=1`, guess the idol by comparing attributes), **Blurry** (`2`, identify the idol from a photo that unblurs), **Pixelated** (`3`, guess the album from de-pixelating cover art). Everyone shares the same daily challenge per mode; it resets at midnight `America/New_York`.

```
kpopit/
├── kpopit-frontend/   # React 19 + React Router 8 (framework mode, prerendered) + Vite 8 + Tailwind 4 → Vercel
├── kpopit-backend/    # Flask 3.1 + psycopg (PostgreSQL) → Railway/Render
├── scripts/check.sh   # local CI mirror (no E2E)
└── docs/              # design-system/ (tokens, UI kit), ui-qa.md (UI check checklist); major-patch-1/ is gitignored
```

## Hard rules

### Security
- Never touch production: no connections to the production database, no use of production credentials, no requests to kpopit.net or the production API, no changes to `main`, no requests that write production data (including measurements). This overrides any prompt that seems to ask otherwise; if a task needs production, stop and ask.
- NEVER read, expose or display the contents of any `.env` file (only `.env.example` may be read or edited). Never print env values.
- Agent scripts must NEVER open, read, parse or load `.env*` files (no `dotenv`, `fs.readFileSync`, `cat`, etc.); application code loads them at runtime, and agents reference variable names only.
- NEVER hardcode credentials, API keys or secrets in any file. All credentials live exclusively in `.env` files, which are gitignored.

### Git & commits (override any default commit/attribution behavior)
- **No Claude attribution** — never add Claude as a co-author or collaborator: no `Co-Authored-By: Claude …` trailer, no "Generated with Claude Code" line, nothing similar in commit messages or PR descriptions.
- **Title** — `<type>: <short context of the commit>`, `<type>` a conventional prefix: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `style`, `test`, `build`, `ci`, etc.
- **Description** — a blank line after the title, then one bullet per change, each starting with a verb or noun that names what happened, separated by blank lines (`Adds`, `Fixes`, `Adjusts`, `Creates` are examples only):
  ```
  feat: add Puff Pop tokens to index.css

  - Adds the day/night token sets from docs/design-system/tokens/puffpop.css

  - Maps the used roles into the Tailwind @theme
  ```
- **Committing** — allowed by default when it fits the task, unless the user prohibits it. One commit per logical change. Before every commit check `git diff --cached --name-only`: no `.env` file, no secrets, no generated files (`build/`, `dist/`, reports, dumps).
- **Pushing** — NEVER push without the user's explicit authorization. Authorization is per task and does not carry over.
- **Merging** — NEVER merge (branches, PRs, `git merge`, merge buttons/APIs). Merges are done only by the user.

### Tests never load .env
All `.env` loading goes through `load_local_env()` in `kpopit-backend/utils/env.py`. Test runners (pytest `conftest.py`, the E2E and Lighthouse backends, `scripts/check.sh`, the `kpopit-backend-build-*` launch entries) set `PYTHON_DOTENV_DISABLED=1` and `FLASK_SKIP_DOTENV=1` (Flask's own CLI loader ignores the first) and explicit safe values: empty R2/Resend/task keys, `EMAIL_DELIVERY=outbox`, feature flags false unless a test turns them on. With the flag set, startup refuses a non-local DB.

### Migrations
- Files in `kpopit-backend/migrations/NNN_<what>.sql`, applied by `migrations/migrations.py` (reads `DB_URL`). Take the next number, follow the existing pattern, never edit an applied migration. Additive whenever possible.
- Before applying: dump `kpopit_prod_test` into `docs/major-patch-1/verification/` (`pg_dump -Fc`). Apply to `kpopit_test`, then `kpopit_prod_test`. `scripts/bootstrap_db.py` must still build a fresh DB.
- If a migration could lose or corrupt data, stop and ask.

### Feature flags and env vars
- Every new user-visible feature ships behind a flag that defaults to off in code. A new flag/env var gets: a one-line comment in `.env.example`, and an explicit value in every test runner (`tests/conftest.py`, `kpopit-frontend/e2e/support/env.ts`, `lighthouse/backend.mjs`, `scripts/check.sh` if it needs it, both `kpopit-backend-build-*` entries in `.claude/launch.json`).
- Backend flags reach the frontend through one endpoint, `GET /api/features` (see Architecture). A disabled feature's routes 404 and its nav links don't render.

### Comments
- Inline comments: 1–2 lines, explaining why (not what the code says).
- Longer explanations (docstrings, module headers, non-obvious workarounds): 3–5 lines max. Anything longer belongs in docs.
- No dead commented-out code, no references to local/gitignored docs (e.g. "plan §3", task ids), no `noqa`/`pragma`/`eslint-disable` to hide a problem: fix the cause. If a suppression is truly unavoidable, one line saying why.
- Keep on purpose: labeled testing toggles (e.g. the commented `idol_id = 1` / album override in the daily routes, used to force a pick while testing) and usage examples in helpers (e.g. the `utils/dates.py` examples). Don't strip them in cleanups.

### Editing and frontend style
- **Edit in place** — change the existing file; never replace it with a `V2`/renamed copy. `git mv` only when the old name no longer fits what the file holds.
- **Never drop old CSS or behavior while rewriting** — GPU layers (`transform-gpu`, the global `img`/`canvas` rules), `backface-visibility`, Firefox rules and `image-rendering` stay. Removing something needs a measured reason, stated in the commit.
- **Tailwind first** — a `.css` file holds only keyframes, long puffy text-shadow recipes, scrollbars, masks, `:active` rules that must beat hover, styles for generated HTML (the blog's `.post-body`) and Day/Night token blocks. Classes shared across pages live in `src/index.css`. A page CSS file with nothing left is deleted.
- **Canonical classes** — write every class the way Tailwind's IntelliSense suggests (`size-4`, `text-sm/relaxed`, `rotate-[-2deg]`, `shadow-(--x)`); zero "can be written as" warnings.
- **Readable code** — blank lines between logical blocks; descriptive names (no `m`, `p`, `c`, `k`, `LT`, `ROT`); long class strings split with `cn()`, one concern per line (layout, box, type, motion, state); components as `const Name = () => {}`. CSS is formatted like `pages/Idols/IdolProfile.css`: one declaration per line, a blank line between rules, a heading comment per section.
- **Motion on the compositor** — animate `translate`/`rotate`/`scale`/`opacity` (Tailwind `transition-[translate,…]`), never custom properties or layout. Small controls keep a permanent layer (`will-change-transform` / `transform-gpu`); no scale on text; hover never changes a shadow (press may); zoom a photo on the `<img>` itself, never through its frame. Entrance animations use `backwards` fill.

## Commands

```bash
# Frontend (kpopit-frontend/)
npm run dev          # react-router dev (Vite + HMR) on :5173, proxies /api to :5000
npm run build        # tsc -b + react-router build (prerenders; needs a backend at PRERENDER_API_URL)
npm run lint         # ESLint, --max-warnings 0 (same as CI)
npm test             # node --test on tests/**/*.test.mjs (pure helpers)
npm run test:e2e     # Playwright, file by file (ports 5000, 5101–5104, 5173 must be free)
npm run test:lighthouse
npm run preview      # serve the production build

# Backend (kpopit-backend/, use .venv/bin/python or .venv/Scripts/python.exe)
python app.py                    # Flask dev server (debug) on :5000 — macOS AirPlay may hold :5000
python -m pytest -q              # needs TEST_DB_URL=<local kpopit_test>
python -m ruff check .
npx pyright                      # basic mode, pyrightconfig.json (uses .venv)
python migrations/migrations.py  # applies pending migrations to DB_URL
python scripts/bootstrap_db.py   # fresh DB: init → migrations → CSVs → collection cards
python init_db.py / seed_db.py   # schema / seed data
gunicorn app:app                 # production server
```

### Full local check (repo root)
```bash
scripts/check.sh      # CI without E2E, in order, stops at the first failure: ruff, compileall, pytest, lint, tsc, npm test, build
```
Needs `TEST_DB_URL` (local `kpopit_test`) and a local test backend for the build's prerender: the `.claude/launch.json` build entry for your OS serves a `scripts/bootstrap_db.py`-built `kpopit_build` with dotenv disabled and dummy secrets. Run it and have it pass before reporting READY TO MERGE.
- **macOS/Linux** — start `kpopit-backend-build-mac`, then `TEST_DB_URL=postgresql://localhost/kpopit_test scripts/check.sh`.
- **Windows** — start the local passwordless test cluster on `127.0.0.1:55432` (`pg_ctl ... -o "-p 55432" start`, holding `kpopit_test` and a bootstrapped `kpopit_build`) and `kpopit-backend-build-windows` (needs `env` from Git for Windows/MSYS2 on `PATH`), then in Git Bash `TEST_DB_URL=postgresql://postgres@127.0.0.1:55432/kpopit_test scripts/check.sh`, or from PowerShell `$env:TEST_DB_URL = 'postgresql://postgres@127.0.0.1:55432/kpopit_test'; bash scripts/check.sh`. Stop the cluster afterwards.

### Test databases (all local)
| Database | Used by | Notes |
|---|---|---|
| `kpopit_test` | pytest (`TEST_DB_URL`) | TRUNCATEd and re-seeded per test; pytest refuses any other name or a remote host |
| `kpopit_build` | build prerender, `check.sh` | built by `scripts/bootstrap_db.py`, served by the `kpopit-backend-build-*` entry |
| `kpopit_pre_major_patch` | Playwright E2E (`E2E_DB_URL`), manual pass | copy of production with real users: tests only add rows; never truncate, print or export users |
| `kpopit_prod_test` | migration rehearsal, `EXPLAIN` checks | dump it before every migration |

Details: `kpopit-backend/tests/README.md`. Run each new test right after writing it; heavy runs (check.sh, full E2E, Lighthouse) one at a time, never two at once.

## Tools

### Pyright (`pyright-lsp`)
`kpopit-backend/pyrightconfig.json` runs basic mode against `.venv`. Fix new Pyright errors in files you touch; don't mass-fix old ones in unrelated changes.

### Playwright MCP (UI checks)
- Use it only when a change affects how a page looks or behaves. Never for backend-only or type-only changes.
- Local only: the localhost frontend + a local test backend/DB. Never kpopit.net.
- Set the viewport explicitly (the host screen doesn't matter): phones 360×800, 390×844, 430×932; desktops 1280×800, 1440×900, 1920×1080, 2560×1440. Check Day and Night.
- Click every control the change touched; report console errors and failed requests; describe what you saw or attach screenshots.
- It runs at the end of a phase, after `check.sh` and E2E. It complements the E2E specs, never replaces them.
- Checklist and example prompts: `docs/ui-qa.md`.

## Architecture

### Data flow
1. Frontend gets a UUID user token via `POST /api/user/init` and keeps it encrypted in localStorage.
2. Game load fetches the daily challenge: Classic `GET /api/game/classic/daily-idol`, Blurry `GET /api/game/blurry/daily-idol`, Pixelated `GET /api/game/pixelated/daily-album`.
3. Guesses go to the backend, which records them (`daily_user_history.guessed_ids`, atomic append; the array length is the attempt number) and returns per-attribute feedback (`correct`, `partial`, `higher`, `lower`, `incorrect`).
4. Per-day screen state (guesses shown, completion, hints) lives in localStorage and is cleared on a new day.
5. Stats and history live server-side in PostgreSQL, keyed by user.

### Backend (`kpopit-backend/`)
- **`GET /api/features`** — `{calendar, idol_xp, public_profile, collection}` booleans from the existing flags, `Cache-Control: public, max-age=60`.
- **`app.py`** — Flask entry; registers the blueprints under `/api` (feature blueprints only when their flag is on: `ADMIN_ENABLED`, `COLLECTION_ENABLED`, `PUBLIC_PROFILE_ENABLED`, `CALENDAR_ENABLED`, `IDOL_XP_ENABLED`), CORS, maintenance mode, `load_gamemode` (reads `gamemode_id` into `g.gamemode_id`, default 1).
- **`routes/`** — `games/` (classic, blurry, pixelated, restore), `idols_page/`, `collections/`, `auth.py`, `email.py`, `profile.py`, `calendar.py`, `idol_xp.py`, `tasks.py` (backup + account purge), `ranking.py`, `users.py`, `general.py`.
- **`services/`** — business logic. `daily_draw.py` runs the one daily draw shared by every mode (`ensure_daily_picks`: stateless from `daily_picks`, 10-day cooldown, ultimatum for overdue items, capped wait weight + never-picked boost + late pressure; draws one day ahead, tomorrow's pick is never returned or logged). `game_service.py` owns scoring and streaks. `album_service.py` (Pixelated), `calendar_service.py`, `xp_service.py`, `profile_service.py`, `collections_service.py`, `auth_service.py`, `email_service.py`, `backup_service.py`.
- **`GameService.save_user_history`** is the single owner of the `daily_user_history` upsert, score, `user_history` streaks/aggregates, the double-count guard and the `commit()`. Every mode's `process_guess` delegates to it — never duplicate this logic.
- **`repositories/`** — data access over PostgreSQL. **`utils/game_feedback_logic.py`** — feedback engine. **`utils/dates.py`** — all daily logic.

### Frontend (`kpopit-frontend/`)
- **`app/`** — React Router 8 framework mode, `ssr: false` (static build, output `build/client`). `root.tsx` holds the site-wide `<head>`, the providers (QueryClient, Helmet, AuthProvider, Vercel Analytics/Speed Insights) and maintenance mode. `routes.ts` lists every route, with `MainLayout` (and `ProtectedRoute`) as layouts, pointing at **thin modules in `app/routes/`** that render `src/pages` components. There is no `src/main.tsx` and no `react-router-dom`; import from `react-router`.
- **`routes.ts` runs in Node at build time**: it reads `VITE_*` through Vite's `loadEnv`. The admin route only exists (at `VITE_ADMIN_ROUTE`) when `VITE_ADMIN_ENABLED=true`, so without the flag it isn't in the build. Collections checks its env flag inside the route module.
- **`react-router.config.ts`** prerenders the static and content paths plus every `/idols/:id/:slug` (list fetched from `PRERENDER_API_URL` via `app/prerender-api.ts`; the build fails if it can't, except on Vercel preview). `buildEnd` writes `sitemap.xml` from `app/sitemap.ts` (never Idol XP, profiles, auth, admin or the `/major-patch` stub). Unknown paths render the 404 page (`noindex` via `PageMeta`). Other routes load from `__spa-fallback.html` (the `vercel.json` rewrite).
- **`src/`** — `pages/<Page>/` (one folder per page), `components/<Name>/` (shared), `hooks/`, `services/api.ts` (Axios client + interceptors), `interfaces/` (types; game shapes in `gameInterfaces.ts`, collections in `albumInterfaces.ts`), `content/` (plain-text page content shared by pages and modals), `utils/`, `index.css` (Tailwind `@theme` + tokens).
- **`hooks/useSharedGameData.tsx`** — user token (issue/decrypt, readiness as a query), the `["allIdols"]` list, user stats.
- **`components/GameDayProvider.tsx`** — wraps every game page: keys the page by its game day (a new day remounts it, no reload), runs the midnight countdown, refetches on the api's "Game date mismatch" event. Daily queries spread `DAILY_REFETCH` (refetch on focus/visibility + every 30 min).
- **Puff Pop pages** — route modules export `handle = { puff: true }`: `MainLayout` then paints the cream/graphite ground and the navbar follows the saved theme. Other (old-look) pages get `NavBar forceTheme` ("night"; Pixelated keeps "day" via `handle = { navTheme: "day" }`; toggle hidden, space kept). Tokens live in `src/index.css` (`:root`/`[data-theme]` variables, read as `bg-(--ground)` etc.); shared pieces: `components/PageShell/` (`PageShell`, `PuffTitle`/`KoreanTag`, `SideIndex`), `components/buttons/` (`PressButton`/`PressLink`/`PressAnchor`/`Pill`, `SlidingPill`), `components/Accordion/` (`Accordion`/`Collapse`), `components/HScrollRow/`, `components/Toast/` (`useToast`), `components/ListCard/`; page-only pieces stay in their page folder (`pages/IdolXP/PuffCard`, `pages/Calendar/MonthPicker`). The shared `pp-*` rules (press, focus, scrollbars, collapse, entrance keyframes) and the `puff-ink` utility live in the "Puff Pop shared rules" section of `src/index.css`.
- **Theme** — `utils/theme.ts` + `hooks/useTheme.ts`; localStorage key `kpopit-theme`. `THEME_INIT_SCRIPT` (inline in `app/root.tsx`'s head) sets `<html data-theme>` before the first paint; the prerendered HTML ships Day.
- **Navbar** — `components/NavBar/` (`NavBar.tsx`, `ButtonsDroplist.tsx` desktop menus, `ButtonsListMobile.tsx` sheet, `UserDropdown.tsx`; `navigation.ts` holds the rows, `PREFETCH`, `MAJOR_PATCH` (`show: false` until the patch page exists) and `pageOf`/`menuOf` for the current section). Links of disabled features don't render.
- **Feature flags** — `GET /api/features` (`services/features.py`, one line per flag) → `hooks/useFeatures.ts`. The root `loader` reads it at build time (prerendered nav/pages match), `shouldRevalidate` keeps it, a fresh read follows; any failure = all off. Flag-gated pages wrap in `components/FeatureGate.tsx` (off → the 404 page).
- **Blog** — Markdown posts in `content/blog/*.md` (frontmatter: title, date, description, image, imageAlt, `tag` ∈ Update/Dev log/Thoughts/News, optional `pinned`; see `content/README.md`). `vite-plugins/markdownPosts.ts` renders them at build time (`src/utils/markdown.ts`; `marked` never ships to the browser; read time = ceil(words/200)); `src/content/blog.ts` lists them; `app/blog-paths.ts` prerenders one page per post. `#` in a post is an h2 (numbered chip).
- **Content data** — typed modules, one source per page and its structured data: `src/content/changelog.ts` (changelog, `?type=`), `src/data/faq.ts` (FAQ + its FAQPage JSON-LD, feature-gated questions), `src/data/privacy.ts` (policy text + `UPDATED`), `src/data/contact.ts` (channels, `contactMailto`). Change the privacy text only to match real data handling. FAQPage JSON-LD lives only on `/faq`; WebApplication/WebSite only on home.
- **Catalogue + detail pages** — `/idols`, `/albums` share `components/ListFilters/` (`SearchField`, `FilterMenu`, `AppliedFilters`, `FiltersToggle`, `ListEmptyState`) and `components/ListCard/`; filters live in the URL. `/idols/:id/:slug` (`pages/Idols/IdolProfile.tsx`, facts in `idolFacts.ts`) and `/albums/:id/:slug` load through route `clientLoader`s with the prerendered `.data` snapshot + intent prefetch (`loadWithSnapshot`, `holdForData`).
- **Calendar** — `/calendar` (flag `calendar`, `pages/Calendar/`): month/timeline views, mode + day in `?mode=&date=`. Past days play at `/<mode>?date=YYYY-MM-DD` (`useCalendarDate` → `pages/CalendarGame/`, the live components with `persist={false}`, server feedback only, no localStorage).
- **URL state on prerendered pages** — `?tag=`, `?type=`, `?mode=` apply after hydration (`useHydrated`), so the HTML always matches the first render.

### State management
- **React Query** — all server state. `["allIdols"]` / `["allAlbums"]` start from a localStorage copy (`utils/persistedList.ts`, versioned keys, ignored after 7 days) and refetch once per visit; `["userStats", token]` per user. Key every daily query by mode.
- **localStorage** — per-mode game state (`GuessedIdols`, `todayGuessesDetails`, `gameComplete`, `gameWon`, `hint1Revealed`, `hint2Revealed`, `{mode}_lastPlayedDate`), theme and other per-viewer conveniences.
- No global React Context besides auth and game day.

## Gotchas
- **Prerender must match the first browser render.** Browser-only values (storage, viewport, today's date, theme) wait for `useHydrated()` / `<ClientOnly>`; game pages render client-only behind `app/game-page.tsx`. Never touch `window`/`localStorage`/`document` at module level.
- **Page metadata = `PageMeta`** (`components/Seo/PageMeta.tsx`: title, description, robots (`noindex` for 404/placeholders), canonical, OG/Twitter, JSON-LD). Never raw `<Helmet>` in a page; the root head carries no title/description.
- **Idol slugs** come only from `buildIdolSlug` (`[a-z0-9-_]`); the idol page redirects any other slug to the canonical one. Detail routes are `/<kind>/:id/:slug` so a renamed item keeps its URL.
- **A route with a build-time `loader`** must have at least one prerendered path, or the build fails.
- **`gamemode_id` is injected globally** by the `api.ts` request interceptor (from `localStorage["kpopit_gamemode"]` via the `MODES` table) on every non-`/auth` request; don't pass it manually.
- **Reload via `safeReload()`**, never `window.location.reload()` directly (one-shot guard against reload loops).
- **Selective localStorage removal, never a blind wipe** — per-mode key lists in `useClearGameStorage`. The one deliberate `localStorage.clear()` (invalid-token reset in `api.ts`) re-preserves `kpopit_session` + `kpopit_was_authenticated`.
- **Debug logs behind `import.meta.env.DEV`** (`PixelatedMode.tsx` still logs raw — the current exception).
- **Dates** — game-day helpers vs real-time helpers (see Dates); never `datetime.now()` in game logic.
- **Tailwind 4 `(--var)` shorthands** — `bg-(--x)`, `w-(--x)`, `gap-(--x)`, `shadow-(--x)`, `text-shadow-(--x)` work (Tailwind 4.3), but `justify-(--x)` / `items-(--x)` / `text-(--x)` (as alignment) don't set what they look like: use `[justify-content:var(--x)]`, `[align-items:var(--x)]`, `[text-align:var(--x)]`. Container queries: `@max-[N]` means *below* N, so a CSS `max-width: 580px` is `@max-[581px]`.
- **Entrance animations use `backwards` fill** (never `both`/`forwards` on elements that move on hover/press): a filled transform overrides the hover and press transforms.
- **macOS**: AirPlay Receiver holds port 5000; free it before starting the backend.

## Code conventions

**Backend**
- **Thin routes, service-owned logic** — handlers acquire `get_db()` + a cursor, wrap the body in `try/finally: cursor.close()`, and delegate to a Service class. Services receive `connect`/`cursor` as arguments and never call `get_db()` themselves.
- **Pooled, dict-row connections** — `get_db()` returns a request-scoped connection from the shared `ConnectionPool` (on `flask.g`); `row_factory=dict_row` pool-wide, so rows are accessed by key. Teardown rolls back and returns the connection.
- **Roll back on error** — on any exception mid-transaction `connect.rollback()` (the pool enforces `idle_in_transaction_session_timeout`). Services re-raise after rolling back.
- **Reads before the write/commit** — run all `SELECT`s before the mutating call; `save_user_history` owns the single `commit()`.
- **Defensively normalize external input** — `request.get_json() or {}`, `get_analytics_data() or {}`.
- **Dates over the wire** — derived/minimal fields (e.g. `release_year` via `EXTRACT(YEAR FROM release_date)::int`), never full timestamps; full dates only through detail endpoints.

**Frontend**
- **Design** — `kpopit-frontend/DESIGN.md` (Puff Pop) is the default visual language; exact tokens, components and the UI kit live in `docs/design-system/`, which wins on any value conflict. It's a baseline, not a hard rule: when the user asks for a new visual direction for a feature, follow it and update DESIGN.md if they want it to become the baseline.
- **Styling** — Tailwind classes (arbitrary values for exact numbers) merged with `cn()` (`src/lib/utils.ts`); see **Editing and frontend style** for what may live in `.css`.
- **Per-mode React Query keys** — `["pixelatedDailyAlbum", gameMode]`, `["dailyUserCount", gameMode]`. Client-side search lists (`["allAlbums"]`, `["allIdols"]`) are fetched once and filtered locally — no per-keystroke endpoint.

## Adding a new game mode
Every mode follows the same shape (Classic → Blurry → Pixelated) on both stacks. Reuse it.

**Backend**
- **Blueprint + `gamemode_id`** — add `routes/games/<mode>.py`, register it under `/api` in `app.py`, assign the next `gamemode_id`.
- **A Service owns the mode's logic** (`services/<x>_service.py`, constructed with the connection, given `cursor`/`connect` per call):
  1. **Daily pick** — add the mode to `_MODES` in `services/daily_draw.py` (eligible items + entry date) and call `ensure_daily_picks`; it writes `daily_picks` keyed by `(pick_date, gamemode_id)`.
  2. **Daily fetch** — only what the client needs to render/play (no answer-revealing extras beyond the hints the UI uses).
  3. **`process_guess`** — resolve the correct answer, then delegate persistence to `save_user_history`. A new mode adds zero scoring/streak code.
- **Source table gated by `is_published`** — mirror `idols` / `albums`.

**Frontend**
- **Page + route** — add `pages/<Mode>/`, a route module in `app/routes/` (wrapped in `GamePage`), register it under `MainLayout` in `app/routes.ts` (plus `react-router.config.ts` to prerender it), extend the `GameMode` union + `MODES` list in `hooks/useGameMode.tsx` (it derives the mode from the URL and writes `localStorage["kpopit_gamemode"]`).
- **Endpoints, types, components** — calls in `services/api.ts`, shapes in `interfaces/gameInterfaces.ts`, UI under `components/<Mode>/`.
- **Game-state lifecycle** — register the mode's keys as a `<MODE>_KEYS` array in `useClearGameStorage`. The page compares the server's `server_date` with the stored `<mode>GameDate`; on mismatch it clears those keys and calls `onNewDay(serverDate)` from `useGameDay()`.

## Authentication
- **Approach** — optional JWT layer on top of the anonymous UUID flow. Access token (1h) in React memory; refresh token (30d) in an httpOnly cookie scoped to `/api/auth`; the anonymous UUID stays in encrypted localStorage for users who never sign up. `Authorization` accepts `Bearer <jwt>` or a bare UUID; game routes accept both via `@optional_auth`. Token-keyed stats/game-state routes read the UUID from the `X-User-Token` header (the old `/<user_token>` path routes stay one release).
- **Endpoints** — `/api/auth/`: `register`, `login`, `logout`, `refresh`, `me`, `claim` (upgrades an anonymous UUID into an account; `users.id` never changes).
- **Rate limiting** — Flask-Limiter per client IP (`ProxyFix(x_for=1)`), in-memory, per gunicorn worker. `register`/`claim` 5/min, `login` 10/min, `refresh` 30/min. A custom `RateLimitExceeded` handler returns JSON 429 and keeps `Retry-After` (exposed through CORS).
- **Files** — `routes/auth.py`, `services/auth_service.py` (bcrypt cost 12, JWT, register/login/claim), `repositories/user_repository.py`, `utils/auth_helpers.py` (`detect_user()`, `decode_jwt()` HS256-pinned with `type` claim, validators), `utils/auth_decorators.py` (`@optional_auth`, `@require_auth`, `@require_admin`), `utils/rate_limiter.py`.
- **Tables** — `user_profiles` (display_name, avatar_url, bias ids, `is_public`, `show_match_history`, `show_activity`), `refresh_tokens` (SHA-256 hashed, revocable), `email_tokens` (SHA-256 hashed, `token_type`-discriminated), `username_reservations` (old name held 15 days, redirects), `users.deletion_requested_at` (15-day grace, cancelled by logging in; purged by `POST /api/tasks/purge-deleted-accounts`).

### Input validators (`utils/auth_helpers.py`)
Return `None` if valid, an error string otherwise (except `validate_and_normalize_email`, which returns the normalized email or `None`).
- `validate_username` — 3–12 chars, `[a-zA-Z0-9_-]`. `validate_display_name` — required, max 30. `validate_and_normalize_email` — `email_validator`, no deliverability check. `validate_password` — 8–128 chars (upper bound prevents bcrypt DoS).

### Frontend auth layer
- **`contexts/AuthProvider.tsx` + `contexts/auth_context.ts`** — mounted at the root; exposes `{ isAuthenticated, isLoading, user, refreshAuth }`. On mount it tries a silent `/auth/refresh` → `/auth/me` if a session marker exists. **`hooks/useAuth.ts`** throws outside the provider.
- **`services/tokenStore.ts`** — the JWT access token lives in JS memory only; NEVER in localStorage/sessionStorage.
- **Session markers** — `kpopit_session` (localStorage for remember-me, sessionStorage otherwise; its absence skips `restoreSession`). `kpopit_was_authenticated` (sticky; only when set do we wipe `userToken` + game state on session loss).
- **`services/api.ts` interceptors** — request: `Authorization: Bearer <jwt>` on every non-`/auth/refresh` call, `gamemode_id` on non-`/auth` routes. Response: on 401 (except `/auth/login|register|claim|refresh`) one retry through `refreshToken()` (deduplicated by `inFlightRefresh`). On `400 "Invalid user token"` it clears storage and reloads; on `"Game date mismatch"` it emits the game-day event.
- **Anonymous-compatible endpoints** — `getDailyIdol` / `getBlurryDailyIdol` pass the decrypted UUID as a bare `Authorization` header, overriding any JWT.

## Email workflows (`routes/email.py`)
- **Endpoints** — `/api/auth/email/`: `send-verification-email` (auth), `verify-email`, `forgot-password`, `reset-password`, `request-email-change` (auth + current password), `confirm-email-change`, `revert-email-change`.
- **Token model** — shared `email_tokens` table. Raw token `secrets.token_urlsafe(32)`, only the SHA-256 hash stored. Previous unused tokens for the same `(user_id, token_type)` are deleted before issuing. Consumers check `used_at IS NULL` and `expires_at > NOW()` (UTC) and stamp `used_at`.
- **`token_type`** — `verify_email` (24h), `password_reset` (1h, revokes all refresh tokens), `email_change` (24h, metadata `{new_email}`, link to the NEW address), `email_revert` (14d, metadata `{old_email, new_email}`, link to the OLD address). `email_tokens.metadata` is JSONB.
- **Email change** — `request-email-change` needs the current password and rejects emails in use. `confirm-email-change` sets `users.email` + `email_verified=TRUE`, catches `UniqueViolation` (409), issues an `email_revert` token and emails both addresses. `revert-email-change` restores the old email and revokes all refresh tokens.
- **Rate limits** — `send-verification-email` / `forgot-password` / `request-email-change` / `confirm-email-change` / `revert-email-change`: `3 per hour; 5 per day`. `verify-email`: `10 per hour`. `reset-password`: `5 per hour; 10 per day`.
- **Generic responses** — `forgot-password` always returns the same message (no account enumeration).
- **`RESEND_EMAIL_FRONTEND_URL`** — base of every email link; read once at import in `routes/email.py` and `services/email_service.py` into a module constant of the same name. Tests use `EMAIL_DELIVERY=outbox` (only with `FLASK_ENV=development`), never real Resend.

## Dates (`utils/dates.py`)
- **Game-day helpers** (which puzzle, history day, streak day): `get_today_now()`, `get_today_date()`, `get_today_date_str()` (ISO). Anchored to `America/New_York`.
- **Real-time helpers** (never offset): `utc_now()` for token/session timestamps and every `email_tokens` / `refresh_tokens` expiry; `est_now()` / `get_current_timestamp()` for real New York moments (`created_at`, `won_at`, transfer-code expiry).
- **`TEST_MODE`** — with `FLASK_ENV=development`, `TEST_DATE_OFFSET` shifts only the game-day helpers. Production ignores it.

## Database highlights
- `idols` / `albums` — `is_published` gates daily selection (albums = Pixelated source).
- `daily_picks` — pick per `(pick_date, gamemode_id)`; drives cooldowns.
- `daily_user_history` — per user/day/mode: `guessed_ids INT[]` (ordered), `guesses_origin` (`live`/`backfill`), `is_calendar`, `won`, `one_shot_win`, `score`, `started_at`, `won_at`, `card_granted_at`.
- `user_history` — aggregate stats per mode (streaks, averages). Calendar games count in wins, never in streaks or ranking.
- `idol_selections` — Idol XP selection history (one current per user). XP is computed per request from history.
- `blurry_mode_data`, `group_features` (Album 1 palette/image), `collections` / `collection_group_eligibility` / `cards` / `user_cards`.

## Collection system (Album 1)
Sticker-album collection on top of the daily games (flag `COLLECTION_ENABLED`). Winning Classic/Blurry (`COLLECTION_GAMEMODE_IDS = (1, 2)`; Pixelated never grants) gives that idol's single card — **one card per idol per collection** (`card_type='idol'`, `group_id` NULL); which group pages show it is resolved at read time through `idol_career`. Repeat wins level it (`LEVEL_CAP = 3`) and increment the uncapped `times_won`. Completing every idol card on a `has_bonus_cover` page auto-grants that page's `group_photo` card.
- **Grant hook** — inside `save_user_history` (first daily win only, `already_won_today` guard), in `SAVEPOINT collection_grant` so a collection failure never rolls back the win. `CollectionService.grant_for_win` claims `daily_user_history.card_granted_at` in the grant's transaction (once per win). A failed grant is retried by `reconcile_cards` right away and again when the viewer loads `/collections/list`. Returns `(is_correct, card_granted)`; Classic/Blurry guess responses carry `card_granted: {card_id, is_new, level, times_won, group_photo: [group_id]} | null`.
- **Card numbering** — contiguous per-collection `card_number` computed at read time (`DENSE_RANK() OVER (ORDER BY idol_id)`), no column. Shared across pages. Group-photo cards are never numbered (`Reward`). Threaded through `albumMapper.ts` → `AlbumMembersPage` + `CardZoomModal`.
- **Reads** — `routes/collections/collections.py`: `GET /api/collections/list` and `GET /api/collections/album/<collection_id>` (every eligible group with `hangul_name`, `debut_year`, `fandom_name`, `company`/`label`, `group_features` `image_path`/`palette`, roster with ownership, `group_photo`; unknown collection → 404). All `@optional_auth`. Card art falls back via `COALESCE` to `idols.image_path` / `group_features.image_path`.
- **Seeding** — `collections` + `collection_group_eligibility` from CSVs via `seed_db.py`; cards from `seed_collection_cards.py` (publish: flip `is_eligible` in the CSV → `seed_db.py` → `seed_collection_cards.py`). `group_features.csv` from `generate_group_features_csv.py` (palette via `generate_group_palette.py`: first declared color wins `main`, the rest sort darkest→lightest). `backfill_collection_cards.py` replays historical wins once (runbook in its header).
- **Frontend** — `/collections` is the list page (`pages/Collection/Collections.tsx`). The album is `/collections/:collectionId/:slug` (`CollectionAlbum.tsx`): the flip-book engine (`components/Albums/AlbumOfCol/`) mounted `chromeless` inside the album chrome (top bar, `AlbumPageIndex`, `AlbumPageCarousel`, `AlbumInfoModal`, mobile index + rotate hint) via `controlRef`/`onPosChange`/`onBookInit`. Shared persisted night mode (`useCollectionNight`, key `kpopit-collections-night`). Card levels: LV1 group-color frame, LV2 gold, LV3 animated holo. Winning shows `CardGrantedReveal` and invalidates `["collectionAlbum"]` and `["collectionsList"]` (only when `card_granted` is non-null). Tap-to-zoom (`CardZoomModal`), mobile Focus mode (shares a synchronous navigation lock with leaf turns), FX panel (`data-fx-*` attributes, never props that re-render the book). The carousel lazy-mounts thumbnails (`IntersectionObserver`). A one-shot DevTools easter egg (`utils/consoleEasterEgg.ts`) prints once per session from `app/root.tsx`.

## Environment variables (names only; values live in `.env`, never read them)

### Frontend
| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base URL |
| `VITE_IMAGE_BUCKET_URL` | Cloudflare R2 CDN for images |
| `VITE_ENCRYPTION_KEY` | AES key for localStorage token encryption |
| `VITE_ADMIN_ENABLED` / `VITE_ADMIN_ROUTE` | Registers the admin route at that path |
| `VITE_MAINTENANCE_MODE` | Shows the maintenance page everywhere |
| `VITE_COLLECTION_ENABLED` | Mounts `/collections` and its NavBar entry; gates `CardGrantedReveal` |
| `PRERENDER_API_URL` | Build time only (not `VITE_`): API the prerender reads. Default `http://127.0.0.1:5000`; production API only on Vercel |

### Backend
| Variable | Purpose |
|---|---|
| `DB_URL` | PostgreSQL connection string |
| `FRONTEND_URL` | Comma-separated CORS allowlist |
| `ADMIN_ENABLED`, `MAINTENANCE_MODE` | Admin blueprint; disable all `/api` routes |
| `COLLECTION_ENABLED` | `collection_bp` + the win→card grant hook |
| `PUBLIC_PROFILE_ENABLED`, `CALENDAR_ENABLED`, `IDOL_XP_ENABLED` | Public profile, calendar, Idol XP blueprints (default false) |
| `R2_*` | R2 credentials/buckets: `R2_BUCKET_NAME` (public images, never backups), `R2_AVATARS_BUCKET_NAME` |
| `R2_BACKUP_BUCKET_NAME` | Private backup bucket (`services/backup_service.py`, `backups_db/`). Required: missing/empty fails closed, never falls back to `R2_BUCKET_NAME` |
| `BACKUP_DB_URL` | Optional `pg_dump` source (read-only `kpopit_backup` role); falls back to `DB_URL` |
| `BACKUP_AUTH_KEY`, `ACCOUNT_PURGE_AUTH_KEY` | Bearer keys for `POST /api/tasks/backup` / `purge-deleted-accounts`; unset = route rejects every request |
| `JWT_*` | `JWT_SECRET_KEY` (≥32 chars), `JWT_ACCESS_TOKEN_EXPIRES`, `JWT_REFRESH_TOKEN_EXPIRES` |
| `RESEND_*`, `EMAIL_DELIVERY` | `RESEND_API_KEY`, `RESEND_EMAIL_FROM`, `RESEND_EMAIL_FRONTEND_URL`; `outbox` for tests |
