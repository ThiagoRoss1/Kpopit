# Pixelated Mode — Ship-Dark Kill Switch

## Context

Pixelated mode (gamemode 3) is finished and needs to merge into `main` **now**, but must
stay **100% unreachable** until a manual launch (targeted ~1 AM day X). The site should look
identical except the Pixelated navbar entry is present but **disabled with a configurable
message** ("Soon" / a date / countdown text you set whenever you want).

Hard requirement: while OFF, *every* pixelated fetch must be impossible — route, API
endpoints, and any `gamemode_id=3` request across shared routes. The backend goes **fully
dark** (no pixelated data served or generated). At launch it flips on and the first request
generates the daily pick instantly (the pick is idempotent).

### Decisions locked (with the user)
- **Switch:** one env var per app, flipped manually + redeploy at launch. Mirrors the existing
  `ADMIN_ENABLED` / `MAINTENANCE_MODE` patterns. No auto-timer, no code edit to go live.
- **Navbar:** reuse the existing `isWip` disabled styling; add a flexible message string
  (`VITE_PIXELATED_LABEL`, default `"Soon"`).
- **Backend:** fully dark — unregister the pixelated blueprint AND reject `gamemode_id=3`
  everywhere.

### Env vars (all default to OFF, so merging to `main` is safe with no env set)
| App | Var | Off value | On value |
|---|---|---|---|
| Backend `.env` | `PIXELATED_ENABLED` | `false` (default) | `true` |
| Frontend `.env` | `VITE_PIXELATED_ENABLED` | `false` (default) | `true` |
| Frontend `.env` | `VITE_PIXELATED_LABEL` | `Soon` (fallback in code) | e.g. `Coming July 2` |

Parsing mirrors existing code: backend `os.getenv("PIXELATED_ENABLED","false").lower()=="true"`;
frontend `import.meta.env.VITE_PIXELATED_ENABLED === "true"`.

---

## Frontend changes (`kpopit-frontend/`)

### 0. New shared feature-config module — `src/config/features.ts` (single source of truth)
Avoid scattering `import.meta.env` string checks. Export:
```ts
export const PIXELATED_ENABLED = import.meta.env.VITE_PIXELATED_ENABLED === "true";
export const PIXELATED_LABEL = import.meta.env.VITE_PIXELATED_LABEL || "Soon";
```
Every gate below imports from here.

### 1. Route gate — `src/main.tsx:67`
Wrap the `/pixelated` route in the flag (mirror the admin-route pattern at `main.tsx:82-84`):
```tsx
{PIXELATED_ENABLED && <Route path="/pixelated" element={<PixelatedMode />} />}
```
When OFF, a direct visit to `/pixelated` falls through to the catch-all `*` → `Navigate to="/"`
(`main.tsx:88`). No new redirect logic needed.

### 2. Navbar disabled item — `src/components/NavBar/navigation.ts`
- Extend `DropLink` (line 1-6) with an optional `soonLabel?: string`.
- Make the Pixelated entry (lines 21-25) driven by the flag:
  ```ts
  {
    label: "Pixelated", path: "/pixelated", icon: "/kpopit-icon-svg.svg",
    isWip: !PIXELATED_ENABLED,
    soonLabel: PIXELATED_LABEL,
  }
  ```
  When ON → `isWip:false` → renders as a normal clickable link (zero visual change).
  When OFF → `isWip:true` → existing greyed/`cursor-default`/grayscale rendering.

### 3. Render the flexible message — `ButtonsDroplist.tsx:40-52` & `ButtonsListMobile.tsx:89-105`
Both already have an `if (item.isWip)` branch that renders the disabled item. In each, render
`item.soonLabel` as a small badge next to the label (e.g. a `<span>` with pink/40 pill styling).
Reuse the existing disabled classes — **no new animation CSS**. This is the only visual addition.

### 4. Kill victory cross-links — `src/hooks/useAllGameModes.tsx:15-23`
This hook feeds `OtherGamemodes` on Classic/Blurry victory cards (`classic_mode.tsx:477`,
`blurry_mode.tsx:564`), which currently lists Pixelated as a "play next" link. Filter it out
when OFF so no live entry point remains:
```ts
const base = [
  { id: 'classic', ... }, { id: 'blurry', ... },
  ...(PIXELATED_ENABLED ? [{ id: 'pixelated', name: 'Pixelated', path: '/pixelated' }] : []),
];
```
(Keeps `PixelatedVictory`'s own `otherModes` — classic/blurry — working when ON.)

### 5. Home page card — `src/pages/Home/home.tsx:143-183`
The Pixelated `<Link to="/pixelated">` card is a prominent entry point. When OFF, replace the
`<Link>` with a non-clickable `<div>` (drop hover/active nav styling), swap the "Play" pill for
the `PIXELATED_LABEL` text, and grey it to match the disabled treatment. When ON, render the
existing card unchanged. Gate with `PIXELATED_ENABLED`.

### 6. Profile stats — `src/pages/User/UserProfile.tsx`
**Critical:** `fetchAllModeStats` (lines 41-49) runs `Promise.all` including the
`gamemode_id=3` call; with the backend dark that call is rejected and the whole profile stats
load fails. When OFF:
- Only fetch classic + blurry; use `EMPTY_STATS` for `pixelated` (or omit it).
- Hide the Pixelated tab/filter option (rendered ~`line 139` and mode-filter map ~`line 409`).

### Frontend surfaces intentionally left unchanged (harmless when OFF)
- `useGameMode.tsx` type/MODES union, `api.ts` pixelated functions + `MODES` mapping,
  `NavBar.tsx` `PageName`/`MODES`, interfaces, `applyRestoredSession`, `useClearGameStorage` —
  never invoked once the route + entry points above are gated. No change needed.

---

## Backend changes (`kpopit-backend/`)

### 1. Flag + conditional blueprint — `app.py`
- Add near the other flags (~line 31):
  `PIXELATED_ENABLED = os.getenv("PIXELATED_ENABLED", "false").lower() == "true"`
- Guard the registration at `app.py:98-99` (mirror `ADMIN_ENABLED` at 80-81):
  ```python
  if PIXELATED_ENABLED:
      app.register_blueprint(pixelated_bp, url_prefix="/api")
  ```
  → all 3 endpoints (`/game/pixelated/daily-album`, `/guess`, `/albums-list`) become **404**.

### 2. Reject `gamemode_id=3` on shared routes — `app.py` `load_gamemode` (lines 74-77)
Shared routes read gamemode from the query param (`/store-yesterdays-album`,
`/daily-users-count`, `/daily-rank`, `/stats`, `/game-state`). Add one choke-point check right
after `g.gamemode_id` is set:
```python
@app.before_request
def load_gamemode():
    g.gamemode_id = request.args.get("gamemode_id", default=1, type=int)
    if not PIXELATED_ENABLED and g.gamemode_id == 3 and request.path.startswith("/api"):
        if request.method == "OPTIONS":
            return
        return jsonify({"error": "Not found"}), 404
```
Default gamemode is 1, so only explicit `?gamemode_id=3` requests are blocked — classic/blurry
untouched.

### 3. Restore-session hardening — `routes/games/restore.py:9,27-51`
Exclude pixelated from the `GAMEMODES` loop (and the `result` dict) when OFF, so authenticated
`restore-session` never touches gamemode 3. Import the flag from `app` config or re-read the
env the same way. (Low risk even if skipped — no pixelated rows get written while dark — but
include it for a clean "fully dark" guarantee.)

### Backend surfaces left unchanged
`AlbumService` (the on-demand pick/guess logic) and `extract_palettes.py` need no edits — they
are only reachable through the now-gated blueprint.

---

## Launch procedure (manual, at 1 AM day X)
1. Backend: set `PIXELATED_ENABLED=true`, redeploy (Railway/Render).
2. Frontend: set `VITE_PIXELATED_ENABLED=true` (and optionally `VITE_PIXELATED_LABEL`), redeploy (Vercel).
3. Verify the navbar item is clickable, `/pixelated` loads, and the first daily-album request
   returns a pick.
(Order doesn't matter much, but enabling backend first avoids a brief window where the UI links
exist but the API is still 404.)

---

## Verification

**While OFF (default — the merge-to-main state):**
- `npm run build` + `npm run lint` in `kpopit-frontend/` pass.
- Nav: Pixelated shows greyed with the `PIXELATED_LABEL` badge, not clickable (desktop dropdown + mobile menu).
- Direct nav to `/pixelated` → redirected to `/`.
- Home Pixelated card is non-clickable and shows the label.
- Classic/Blurry victory cards do **not** offer Pixelated as "play next".
- Profile page loads; no Pixelated tab; classic/blurry stats intact.
- Backend (run `python app.py` with `PIXELATED_ENABLED` unset):
  - `GET /api/game/pixelated/daily-album` → 404
  - `GET /api/game/pixelated/albums-list` → 404
  - `GET /api/daily-users-count?gamemode_id=3` → 404
  - `GET /api/stats/<token>?gamemode_id=3` → 404
  - Same calls with `gamemode_id=1` / `2` → still 200 (regression check).

**With flag ON (pre-launch smoke test in a preview/dev env):**
- Set `PIXELATED_ENABLED=true` + `VITE_PIXELATED_ENABLED=true`; confirm nav link is live,
  `/pixelated` plays a full round, guess + stats + ranking all work, and the site is byte-for-byte
  the current behavior.

## Rollback
Set both env vars back to `false` (or unset) and redeploy — instant, no code revert needed.
