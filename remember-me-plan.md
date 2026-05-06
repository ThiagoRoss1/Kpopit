# Remember Me — End-to-End Wiring Plan

## 1. Current State Audit

### Frontend
- **Checkbox UI** — `kpopit-frontend/src/pages/AuthUser/AuthPage.tsx:349-367`. Fully styled, already bound to local form state via `loginFormData.rememberMe` and toggled by `setLoginFormData` on click. **No state plumbing needed in the form.**
- **Type** — `LoginData.rememberMe: boolean` already exists in `kpopit-frontend/src/interfaces/authInterfaces.ts:1-5`.
- **API call** — `loginUser` in `kpopit-frontend/src/services/api.ts:236-243` already accepts `rememberMe` and posts it as `remember_me` in the JSON body.
- **Hook** — `useAuthUser.login` (`kpopit-frontend/src/hooks/useAuthUser.tsx:40-55`) forwards `data.rememberMe` to `loginUser` correctly.
- **Persistence today** — On every successful login, `localStorage.setItem('kpopit_session', 'true')` is written unconditionally (line 44). `AuthProvider.restoreSession` (`contexts/AuthProvider.tsx:23`) reads that key on mount to decide whether to attempt a silent `refreshToken()` call.
- **Net effect** — Today the checkbox value travels to the backend but the **client-side persistence marker is always durable**, so on app reload the AuthProvider always tries to silently restore the session regardless of the user's choice.

### Backend
- **Login route** — `kpopit-backend/routes/auth.py:98-136` already reads `remember_me` from the body (line 104), and `_set_refresh_cookie` (line 27) already toggles cookie `max_age`:
  - `remember_me=True` → persistent cookie with `max_age=JWT_REFRESH_EXPIRES_SECONDS` (defaults to 2,592,000 s = 30 d).
  - `remember_me=False` → `max_age=None` → browser session cookie (cleared on browser close).
- **Refresh route** — `kpopit-backend/routes/auth.py:161-200`. **Bug:** when rotating, it calls `_set_refresh_cookie(response, ..., remember_me=True)` (line 182) unconditionally. A user who logged in with Remember Me OFF gets silently upgraded to a 30-day persistent cookie on the first refresh. This is the core gap to close on the backend.
- **Token lifetimes** — `services/auth_service.py:13-14`:
  - `JWT_ACCESS_TOKEN_EXPIRES` (env, default `3600` = 1 h) — short-lived, fine as-is.
  - `JWT_REFRESH_TOKEN_EXPIRES` (env, default `2592000` = 30 d) — used both as the JWT `exp` claim and the DB `refresh_tokens.expires_at`.
- **Refresh DB row** — `_store_refresh_token` writes `(user_id, token_hash, expires_at)`. There is **no column today** that records whether the original login was a Remember Me session. This is what we need to add to make refresh-time decisions correct.
- **Register / Claim** — Both always set the cookie with `remember_me=True` (auth.py:93, 306). Registration is implicitly a Remember Me session. Leave as-is unless we want a checkbox on register too (out of scope per task).

### Env Vars
- Backend `.env` already has `JWT_ACCESS_TOKEN_EXPIRES` and `JWT_REFRESH_TOKEN_EXPIRES`. **No new env var is strictly needed** — the same `JWT_REFRESH_TOKEN_EXPIRES` is used for the long session, and the short session is simply a browser-session cookie (no expiration value required, expires on browser close). The JWT `exp` claim on the refresh token can stay at 30 d in both cases — it acts as the absolute upper bound; the practical lifetime of a session-cookie session is "until the browser closes" because the cookie itself disappears.
- **Optional second env var** — Only needed if product wants a *specific* short-session lifetime that survives tab close but not, say, beyond N hours. The task doesn't ask for that, so we will **not** add a second env var.

---

## 2. Two-Tier Expiration Strategy

| | Remember Me OFF (short) | Remember Me ON (long) |
|---|---|---|
| **Refresh cookie** | Session cookie (`Max-Age` omitted) — cleared on browser close | Persistent, `Max-Age = JWT_REFRESH_TOKEN_EXPIRES` (30 d default) |
| **Refresh JWT `exp` / DB `expires_at`** | 30 d (unchanged — acts as hard ceiling) | 30 d |
| **Access token** | 1 h (`JWT_ACCESS_TOKEN_EXPIRES`, unchanged) | 1 h (unchanged) |
| **Frontend session marker** | `sessionStorage["kpopit_session"]` — cleared on tab/browser close | `localStorage["kpopit_session"]` — persistent |
| **Effect on user** | Closes browser → next visit shows logged-out state | Closes browser → next visit silently restores session |

Reuses existing env vars. **No new env vars required.**

---

## 3. Backend Changes

### 3a. Schema migration — record `remember_me` per refresh token

**File:** new `kpopit-backend/migrations/<next_number>_add_remember_me_to_refresh_tokens.sql` (follow naming pattern of existing files in `migrations/`).

```sql
ALTER TABLE refresh_tokens
ADD COLUMN remember_me BOOLEAN NOT NULL DEFAULT FALSE;
```

Existing rows default to `FALSE`. If we later want existing logged-in users grandfathered as long sessions, change default to `TRUE` for the backfill — see §5.

### 3b. `repositories/user_repository.py`
- Update `store_refresh_token(cursor, user_id, token_hash, expires_at)` signature to accept `remember_me: bool` and include it in the `INSERT`.
- Update `find_refresh_token` to also return the `remember_me` column.

### 3c. `services/auth_service.py`
- `_store_refresh_token(self, cursor, user_id, raw_refresh)` → add `remember_me: bool` parameter; pass it to the repo call.
- `_build_token_pair(self, cursor, user)` → add `remember_me: bool` parameter; pass it down to `_store_refresh_token`.
- `login(...)` → accept `remember_me: bool` parameter; pass through to `_build_token_pair`. Return value gains `"remember_me": remember_me` so the route can re-set the cookie correctly.
- `register(...)` and `claim_anonymous(...)` → call `_build_token_pair(..., remember_me=True)` (matches today's behavior).
- `refresh_access_token(...)` → after loading `db_record`, read `db_record["remember_me"]` and:
  - In production rotation branch, when storing the *new* refresh row, pass the same `remember_me` value through (preserves the user's original choice).
  - Return value gains `"remember_me": db_record["remember_me"]` so the route can set the cookie with the correct max_age.

### 3d. `routes/auth.py`
- `login()` — pass `remember_me` to `AuthService.login(...)` (currently it's only used for the cookie). The cookie call at line 134 already uses the local `remember_me`, which is correct.
- `refresh()` — replace the hardcoded `remember_me=True` at line 182 with `remember_me=result["remember_me"]` (value returned by the service from the DB row).
- `register()` and `claim()` — no functional change; they already set `remember_me=True` on the cookie.

### 3e. No changes needed
- `utils/auth_helpers.py`, `utils/auth_decorators.py`, `utils/rate_limiter.py` — untouched.
- `JWT_ACCESS_TOKEN_EXPIRES` / `JWT_REFRESH_TOKEN_EXPIRES` env vars — untouched.

---

## 4. Frontend Changes

### 4a. `src/hooks/useAuthUser.tsx`
- In `login(data)`, branch on `data.rememberMe`:
  - `true` → `localStorage.setItem('kpopit_session', 'true')` (current behavior).
  - `false` → `sessionStorage.setItem('kpopit_session', 'true')` AND `localStorage.removeItem('kpopit_session')` (defensive cleanup so a previous long-session marker doesn't bleed through).
- In `register(data)` and the claim path → keep using `localStorage` (registration is implicitly long-session; matches backend).
- In `logout()` → also call `sessionStorage.removeItem('kpopit_session')` alongside the existing `localStorage.removeItem('kpopit_session')`.

### 4b. `src/contexts/AuthProvider.tsx`
- In `restoreSession`, replace `localStorage.getItem('kpopit_session')` with a helper that checks both:
  ```ts
  const hadSession =
      localStorage.getItem('kpopit_session') ??
      sessionStorage.getItem('kpopit_session');
  ```
- In the `catch` cleanup branch, remove from both stores.

### 4c. No changes needed
- `services/api.ts` — `loginUser` already sends `remember_me`.
- `services/tokenStore.ts` — access token stays in memory only; correct in both modes.
- `interfaces/authInterfaces.ts` — `LoginData.rememberMe` already exists.
- `pages/AuthUser/AuthPage.tsx` — checkbox is already bound; no changes.
- `hooks/useAuth.ts` — consumer of context, no changes.

---

## 5. Edge Cases & Considerations

- **Token refresh inheritance** — After §3c, the refresh endpoint reads `remember_me` from the DB row and reissues a cookie with the matching `max_age`, so the original choice is preserved across rotations. This is the most important fix.
- **Logout** — `logout()` must clear both `localStorage` and `sessionStorage` markers (§4a). Backend `_clear_refresh_cookie` already works in both modes.
- **Existing logged-in users** — They have refresh tokens in the DB without a `remember_me` column. The migration default of `FALSE` would silently demote them to session-only on their next refresh, which is mildly user-hostile. **Recommendation:** run the migration with `DEFAULT TRUE` for the backfill (so the column is added, existing rows get `TRUE`), then `ALTER COLUMN ... SET DEFAULT FALSE` for new rows. Two-step migration in the same file. Document this clearly in the migration comment.
- **Anonymous UUID flow** — Untouched. The encrypted `userToken` in `localStorage` is independent of authenticated session state and remains durable in both modes (so anonymous game progress always survives, regardless of whether the *authenticated* session does).
- **Browser-restore behavior** — Modern Chromium/Firefox have "Continue where you left off" settings that preserve sessionStorage across restart. This is acceptable: it follows the user's browser preference, which is the correct default.
- **Security** — A 30-day persistent cookie is the existing baseline; we are not extending it. Short sessions reduce exposure on shared/public devices, which is the entire point of the checkbox. Refresh tokens are still SHA-256 hashed at rest and revocable on logout/password reset (no change). No new attack surface.

---

## 6. Step-by-Step Execution Order

1. **Backend migration** — Create `migrations/<n>_add_remember_me_to_refresh_tokens.sql` with the `ALTER TABLE` (default TRUE for backfill, then SET DEFAULT FALSE for new rows). Run it locally against the dev DB.
2. **Backend repo layer** — Update `repositories/user_repository.py`: `store_refresh_token` accepts/inserts `remember_me`; `find_refresh_token` returns it.
3. **Backend service layer** — Update `services/auth_service.py`: thread `remember_me` through `_store_refresh_token`, `_build_token_pair`, `login`; preserve it across rotation in `refresh_access_token`. Register/claim hardcode `True`. Login and refresh return values include `"remember_me"`.
4. **Backend route layer** — Update `routes/auth.py`: `login()` passes `remember_me` to the service; `refresh()` reads `result["remember_me"]` for the cookie call. Verify register/claim still pass `True`.
5. **Backend smoke test** — Log in with `remember_me: false` → verify cookie has no `Max-Age`. Hit `/api/auth/refresh` → verify rotated cookie still has no `Max-Age`. Log in with `remember_me: true` → verify `Max-Age` is set; refresh preserves it. Logout clears the cookie in both cases.
6. **Frontend hook** — Update `useAuthUser.login` to write to `sessionStorage` vs `localStorage` based on `rememberMe`. Update `logout` to clear both.
7. **Frontend provider** — Update `AuthProvider.restoreSession` to read from both storages and clean up both on failure.
8. **Frontend smoke test** — Log in unchecked → close browser tab → reopen → expect logged-out. Log in checked → close browser → reopen → expect silently logged-in. Logout in either mode → both markers gone.

---

## 7. Files to Create / Modify / Leave Alone

### Create
- `kpopit-backend/migrations/<next_number>_add_remember_me_to_refresh_tokens.sql`

### Modify
- `kpopit-backend/repositories/user_repository.py`
- `kpopit-backend/services/auth_service.py`
- `kpopit-backend/routes/auth.py`
- `kpopit-frontend/src/hooks/useAuthUser.tsx`
- `kpopit-frontend/src/contexts/AuthProvider.tsx`

### Leave alone
- `kpopit-frontend/src/pages/AuthUser/AuthPage.tsx` (checkbox already wired to local state)
- `kpopit-frontend/src/services/api.ts` (already forwards `remember_me`)
- `kpopit-frontend/src/services/tokenStore.ts`
- `kpopit-frontend/src/interfaces/authInterfaces.ts` (`rememberMe` already typed)
- `kpopit-frontend/src/hooks/useAuth.ts`
- `kpopit-backend/utils/auth_helpers.py`, `auth_decorators.py`, `rate_limiter.py`
- All env files — no new vars; existing `JWT_ACCESS_TOKEN_EXPIRES` and `JWT_REFRESH_TOKEN_EXPIRES` are reused as-is.
