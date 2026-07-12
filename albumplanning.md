# Album 1 Collection System — Implementation Plan

> **Status: BACKEND FULLY COMPLETE (2026-07-11 — schema, seeding, service, hook incl. `card_granted` response, routes, backfill script, 24 passing tests). Only the frontend (§6) and the launch runbook remain.**
> During implementation, check off steps (`- [x]`) as each phase completes.

---

## 0. Status & Pending

**Done:** migrations `025_add_albums_collection.sql` + `026_add_group_image_path.sql`; CSV seeding of `collections` + `collection_group_eligibility` via `seed_db.py` (and `groups.image_path` via `groups.csv`); derived card catalog via `seed_collection_cards.py` (with cardless-page warning); `CollectionService` (grant + bonus unlock + reads, incl. `group_name` and both image fallbacks); SAVEPOINT-isolated grant hook in `GameService.save_user_history` returning `(is_correct, card_granted)`; `card_granted` in the Classic/Blurry guess responses; routes at `routes/collections/collection.py` (with `logger.exception`); `backfill_collection_cards.py` (guard + `--dry-run` verified on dev: 4,467 wins replayed, rolled back); `tests/test_collection.py` (24 tests) + conftest fixtures — full suite green (53 passed).

**Pending:**
- Entire frontend (§6).
- Launch runbook execution (§5 header of the backfill script): publish launch pages → reseed → real backfill run → enable flags.

**Changelog — bugs found & fixed during backend review (2026-07-11):**
- *Anonymous read-path ownership:* the routes originally passed `g.auth["user_id"]` directly, which `detect_user()` leaves `None` for anonymous UUID users (it never hits the DB) → anonymous users were granted cards on win but saw zero ownership on overview/group pages. Fixed with `resolve_user_id(cursor)` in `routes/collections/collection.py` (anonymous UUID → `users.id` lookup, mirroring the guess routes).
- *Duplicate roster rows:* `get_group_page` could return an idol twice if she has multiple `idol_career` stints in the same group. Fixed with `SELECT DISTINCT ON (ic.idol_id) … ORDER BY ic.idol_id`.

---

## 1. Feature Summary

A **sticker-album collection system** layered on top of the existing daily games. Winning a daily challenge grants the user exactly one card. Cards live in a catalog organized as a World-Cup-style album: one page per group ("team"), showing an idol card slot per idol on that page, plus an unlockable bonus "group photo" card when a page is completed.

**Two-collection context:**
- **Collection 1 — "Album 1" (this plan):** fixed roster derived from `idol_career` (full history, not just active memberships), no rarity, no randomness, no auth requirement — anonymous UUID users collect exactly like registered users. Repeat wins of the same idol **evolve** the card (`level`, capped) instead of duplicating it.
- **Collection 2 — seasonal/gacha (out of scope):** reserved conceptually as `collections.id = 2`. Rarity tiers, photo variants, fragments/crafting, trading, and its auth requirement are **not designed or built here**. That system will have its own card table where group/era IS part of a card's identity — do not conflate the designs. The only accommodation in this plan: everything is keyed by `collection_id`, so Collection 2 adds rows/tables, not schema rework.

**Core rules (locked):**
- **An idol card belongs to an idol, period** (`card_type = 'idol'`) — "you've guessed this idol," not "…as a member of group X." One card and one ownership record per idol per collection. Which group pages display that card is resolved at query time via `idol_career`; `group_id` is stored only on group_photo (and reserved `special`) cards.
- One win → one card. There is no page-resolution ambiguity: the win's idol maps to exactly one card.
- Repetition = evolution: same idol again → `level + 1` up to a low cap; no duplicate rows. `times_won` additionally counts every win, uncapped.
- Page membership uses **full `idol_career` history** — an idol who left a group still appears (with her single card) on that group's page, alongside her current group/solo page.
- `group_id = 20` is the real "Soloist" group row (confirmed: `groups.csv` row `20,Soloist,...` and `albums_soloist_check` in migration 022). It is a normal page with `has_bonus_cover = false` — no schema special-casing.
- Bonus "group photo" card: unlocked automatically when every idol card shown on a `has_bonus_cover = true` page is owned. No `idol_id`, no level — binary owned/not-owned. **Consequence of the single-card design (flagged):** one card counts toward every page the idol appears on, so a single win can complete — and unlock the bonus for — more than one page at once. The bonus check therefore scans *all* of the idol's eligible pages.
- Cards can carry curated `image_path` art; **as built, idol cards fall back to `idols.image_path` via `COALESCE`** when card art isn't curated yet (supersedes old Assumption A1 — pages don't need full art curation before publishing). Group-photo art sourcing is an open decision (see §4b #9 discussion / chat).
- Feature-flagged from day one: `COLLECTION_ENABLED` (backend) / `VITE_COLLECTION_ENABLED` (frontend).

---

## 2. Schema — Migration `025_add_albums_collection.sql` (as built)

Applied via `migrations/migrations.py` (filename order, recorded in `schema_migrations`). Verbatim contents:

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collection_group_eligibility (
    collection_id INTEGER NOT NULL REFERENCES collections(id),
    group_id INTEGER NOT NULL REFERENCES groups(id),
    is_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    has_bonus_cover BOOLEAN NOT NULL DEFAULT TRUE,

    PRIMARY KEY (collection_id, group_id)
);

CREATE TABLE IF NOT EXISTS cards (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER NOT NULL REFERENCES collections(id),
    idol_id INTEGER REFERENCES idols(id),
    group_id INTEGER REFERENCES groups(id),
    card_type TEXT NOT NULL DEFAULT 'idol',
    image_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_cards_card_type CHECK (card_type IN ('idol', 'group_photo', 'special')),
    CONSTRAINT chk_cards_identity CHECK (
        (card_type = 'idol' AND idol_id IS NOT NULL AND group_id IS NULL) OR
        (card_type = 'group_photo' AND idol_id IS NULL AND group_id IS NOT NULL) OR
        (card_type = 'special' AND idol_id IS NULL AND group_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_member_card
    ON cards (collection_id, idol_id)
    WHERE card_type = 'idol';

CREATE UNIQUE INDEX IF NOT EXISTS uq_group_card
    ON cards (collection_id, group_id)
    WHERE card_type = 'group_photo';

CREATE UNIQUE INDEX IF NOT EXISTS uq_special_card
    ON cards (collection_id, group_id)
    WHERE card_type = 'special';

CREATE TABLE IF NOT EXISTS user_cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    card_id INTEGER NOT NULL REFERENCES cards(id),
    level INTEGER NOT NULL DEFAULT 1,
    times_won INTEGER NOT NULL DEFAULT 1,
    first_won_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_user_card UNIQUE (user_id, card_id),
    CONSTRAINT chk_user_cards_level CHECK (level BETWEEN 1 AND 3)
);

CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON user_cards (user_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_card_id ON user_cards (card_id);

COMMIT;
```

### Notes on the as-built schema

1. **`card_type` values are `'idol'`, `'group_photo'`, `'special'`** — `'special'` is a reserved third type (`idol_id IS NULL, group_id NOT NULL`, own `uq_special_card` partial unique index); no rows use it yet.
2. **`collections.description`** — extra text column, seeded from CSV.
3. **`user_cards.times_won`** — total wins for the card (default 1, incremented on every repeat win, **not capped**), distinct from `level` (capped at 3 by `chk_user_cards_level`). Capped cards still get an `UPDATE` per win so `times_won` keeps counting — the earlier "skip the write when capped" optimization was deliberately dropped.
4. **Eligibility flags:** `collection_group_eligibility.is_eligible` (page visibility + card-creation gate) and `has_bonus_cover` (completion bonus). Natural composite PK `(collection_id, group_id)` as planned (Q5).
5. Partial unique indexes: `uq_member_card (collection_id, idol_id) WHERE card_type='idol'`, `uq_group_card (collection_id, group_id) WHERE card_type='group_photo'`, `uq_special_card (collection_id, group_id) WHERE card_type='special'`.
6. `user_cards`: `uq_user_card UNIQUE (user_id, card_id)` plus FK indexes on `user_id` and `card_id`.
7. CHECK constraints (`chk_cards_card_type`, `chk_cards_identity`, `chk_user_cards_level`) follow the `albums_soloist_check` convention — service bugs get caught at the DB layer. `LEVEL_CAP = 3` in code is the working rule; the CHECK is the safety net.

---

## 3. Backend Domain Logic (as built)

### 3.1 `CollectionService` (`services/collection_service.py`)

Module constants: `COLLECTION_ENABLED` (env, read once at import — same convention as `RESEND_EMAIL_FRONTEND_URL`), `COLLECTION_GAMEMODE_IDS = (1, 2)`; class constant `LEVEL_CAP = 3`. Constructed with the connection; receives `cursor` per call; never commits (the caller owns the commit), per the `AlbumService` pattern. No repository — runs its own SQL with the passed cursor.

**`grant_card_for_win(cursor, user_id, idol_id, won_at, collection_id=1) -> dict | None`**

1. Resolve the idol card by `(collection_id, idol_id, card_type='idol')`. No card row → `None` (the win simply isn't collectible, never an error).
2. `_insert_new_card` — `INSERT INTO user_cards … ON CONFLICT (user_id, card_id) DO NOTHING RETURNING id, level, times_won`. A returned row means first ownership (`is_new: True`).
3. On conflict (already owned), `_upgrade_card_level` — `UPDATE … SET level = LEAST(level + 1, cap), times_won = times_won + 1 RETURNING …` (`is_new: False`). If the UPDATE matches no row despite the catalog row existing, logs an inconsistent-state warning and returns `None`.
4. `_grant_completed_group_photos` — **always runs** (including the capped path; self-heals pages published late): `_get_completed_group_ids` finds the idol's `is_eligible = TRUE AND has_bonus_cover = TRUE` pages where `COUNT(DISTINCT c.id) = COUNT(DISTINCT uc.id)` (multi-stint duplicate rows neutralized by DISTINCT), then `_insert_group_photo_card` grants each complete page's `group_photo` card via the same `DO NOTHING` insert (missing bonus card row → silently skipped).
5. Returns `{"card_id", "is_new", "level", "times_won", "group_photo": [group_id, …]}` — no `idol_id` field; `group_photo` replaced the originally planned `bonus_unlocked` name. **Currently discarded by the caller — see §3.2.**

**`get_overview(cursor, user_id, collection_id=1) -> list[dict]`** — returns a **bare list** of per-group rows: `group_id, group_name, total_idol_cards, owned_idol_cards, has_bonus_cover, bonus_owned` (`COUNT(DISTINCT …)` for multi-stint safety; `BOOL_OR` over a second `user_cards` LEFT JOIN for the bonus). No wrapping object, no collection-wide `total_cards`/`owned_cards`. Ordered by `group_id`. `user_id=None` → catalog with zero ownership. Groups whose idols have no cards yet are absent (INNER JOIN through `cards`).

**`get_group_page(cursor, user_id, group_id, collection_id=1) -> dict | None`** — three queries:
1. Roster: `SELECT DISTINCT ON (ic.idol_id) idol_id, artist_name, card_id, COALESCE(c.image_path, i.image_path) AS image_path, owned, level, first_won_at … ORDER BY ic.idol_id`. Members do **not** ship `is_active`/`start_year`/`end_year` (dropped from the original plan; re-add later if departed-member styling is wanted). No `i.is_published` filter needed — unpublished idols have no card row, so the INNER JOIN through `cards` excludes them.
2. `group_name` from `groups` (added per §4b #9 — the frontend title no longer depends on the overview cache).
3. Bonus: the page's `group_photo` card (`card_id, image_path, owned`) with `COALESCE(c.image_path, g.image_path)` — Q7 Option A: falls back to the CSV-seeded `groups.image_path` (migration 026) — or `None` when the page has no bonus card.

Returns `{"group_id", "group_name", "members", "group_photo"}` — no counts. Empty roster (unknown/ineligible group, or eligible-but-cardless page) → `None` → route 404s.

> **Schema note (found while writing T13):** `idol_career`'s PK is `(idol_id, group_id)`, so two stints in the *same* group cannot exist as separate rows — the `DISTINCT ON` is defense-in-depth, not load-bearing. The multi-stint test (T13) instead locks in multi-*group* count integrity.

### 3.2 Hook in `GameService.save_user_history` (as built)

Inside `if is_correct:` → `if not already_won_today:`, after the streak update, before the single `connect.commit()`:

```python
if COLLECTION_ENABLED and gamemode_id in COLLECTION_GAMEMODE_IDS:
    cursor.execute("SAVEPOINT collection_grant")
    try:
        card_granted = CollectionService(self.db).grant_card_for_win(
            cursor, user_id, int(answer_id), current_timestamp
        )
        cursor.execute("RELEASE SAVEPOINT collection_grant")
    except Exception:
        cursor.execute("ROLLBACK TO SAVEPOINT collection_grant")
        card_granted = None
        logger.exception("Collection card grant failed; win saved without a card")
```

**SAVEPOINT isolation (§4b #7, implemented):** a collection failure can never cost the user their win — the grant rolls back to the savepoint, is logged, and the win commits normally.

**`card_granted` surfaced (implemented 2026-07-11):** `save_user_history` returns `(is_correct, card_granted)`; `classic.py`/`blurry.py` add `"card_granted"` to their guess responses and `AlbumService.process_guess` discards it. The field mirrors the service dict: `{card_id, is_new, level, times_won, group_photo: [group_id, …]} | null` — non-null only on the first winning guess of the day, exactly when the celebration fires.

All the original placement rationale stands:
- **Zero duplication** — Classic, Blurry (and any future idol mode) all converge on `save_user_history`; no per-route code.
- **Atomic** — card grant commits/rolls back with the win itself (project rule: `save_user_history` owns the single commit). See §4b #7 for the SAVEPOINT refinement proposal.
- **Double-grant safe for free** — the existing `already_won_today` guard prevents re-granting when a user re-submits a correct guess on the same day.
- **Anonymous-compatible for free** — by this point `user_id` is already a resolved `users.id`, whether it came from a JWT or the anonymous UUID lookup in the routes.
- For gamemodes 1/2, `answer_id` **is** the idol id (verified in `classic.py` / `blurry.py`).
- No import cycle: `game_service` imports `collection_service`; `collection_service` imports nothing from `game_service`.

**Pixelated (gamemode 3) does not grant cards** (Q2) — granting is restricted to `gamemode_id IN (1, 2)` via `COLLECTION_GAMEMODE_IDS`.

### 3.3 Routes — `routes/collections/collection.py` (as built)

`collection_bp`, registered in `app.py` under `/api` **only when `COLLECTION_ENABLED`** (mirrors the `ADMIN_ENABLED` gating pattern). Both routes: `@optional_auth`, thin `get_db()` + cursor + `try/finally: cursor.close()`, generic 500 JSON on exception with `logger.exception` server-side (§4b #8, implemented). The interceptor-injected `gamemode_id` query param is simply ignored (harmless, same as `/idols-list`).

**`resolve_user_id(cursor)`** — JWT → `g.auth["user_id"]`; anonymous → `SELECT id FROM users WHERE token = %s` (because `detect_user()` never touches the DB); anything else → `None` (catalog visible, nothing owned — degrades, never errors).

**`GET /api/collection/overview`** → the bare list from `get_overview`:
```json
[
  {
    "group_id": 3,
    "group_name": "TWICE",
    "total_idol_cards": 9,
    "owned_idol_cards": 4,
    "has_bonus_cover": true,
    "bonus_owned": false
  }
]
```
- `total_idol_cards`/`owned_idol_cards` are **per-page slot counts** — the same idol's card legitimately counts on each page that displays it, so sums across groups may exceed the number of distinct cards. This is the sticker-album mental model (slots per page), worth stating so the numbers aren't mistaken for a bug.
- There is no collection-wide distinct total in the response (see §4b #10).

**`GET /api/collection/groups/<int:group_id>`** →
```json
{
  "group_id": 3,
  "group_name": "TWICE",
  "members": [
    {
      "idol_id": 5,
      "artist_name": "Sana",
      "card_id": 12,
      "image_path": "idols/sana.webp",
      "owned": true,
      "level": 2,
      "first_won_at": "2026-07-01T21:14:00Z"
    }
  ],
  "group_photo": { "card_id": 77, "image_path": null, "owned": false }
}
```
404 `{"error": "Group page not found."}` for unpublished/unknown pages. Un-owned cards still ship name + image (no rarity/secrecy in Collection 1); the UI renders them as empty/grayed slots. `group_photo` is `null` when the page has no bonus card (Soloist page).

`collection_id` is fixed server-side (default 1 at the service layer); no client input reaches it — Collection 2 later adds a validated param, not new routes.

---

## 4. Seeding — split between `seed_db.py` and `seed_collection_cards.py` (as built)

**Reference rows come from CSVs via `seed_db.py`** (same `seed_table` upsert machinery as every other table):
- `data/collections.csv` → `collections` (`id, name, description, created_at`) — row `id=1, "Album 1"`.
- `data/collection_group_eligibility.csv` → `collection_group_eligibility` (`collection_id, group_id, is_eligible, has_bonus_cover`), conflict key `(collection_id, group_id)`. Publishing a page = editing the CSV + re-running `seed_db.py`.

**The derived card catalog comes from `seed_collection_cards.py`** (renamed from the planned `populate_collection_cards.py`; standalone, `get_manual_db()`, single commit, rollback on error — it does NOT seed the collection row or eligibility):
- `seed_idol_cards` — one `'idol'` card per `DISTINCT` published idol (`i.is_published = TRUE`, Q4) on any `is_eligible = TRUE` page, `ON CONFLICT (collection_id, idol_id) WHERE card_type='idol' DO NOTHING`.
- `seed_group_photo_cards` — one `'group_photo'` card per `is_eligible AND has_bonus_cover` page, `ON CONFLICT (collection_id, group_id) WHERE card_type='group_photo' DO NOTHING`.
- Prints per-step insert counts **and a warning for eligible pages with zero idol cards** (§4b #11, implemented). Idempotent only through the `DO NOTHING`s (no other guards). `image_path` stays `NULL` — idol cards fall back to `idols.image_path` and group_photo cards to `groups.image_path` (Q7 Option A, migration 026 + `groups.csv` column) at read time.

**Publish flow:** flip `is_eligible` in the CSV → `python seed_db.py` → `python seed_collection_cards.py`. An idol already carded via another eligible page needs nothing new — her single card starts appearing on the new page through the read-time join.

**`data/cards.csv` (dead early experiment) was deleted** (2026-07-11) — `seed_collection_cards.py` is the sole card-catalog source.

---

## 4b. Improvement Suggestions (reviewed 2026-07-11 — **#2, #7, #8, #9, #11, #14 implemented same day**; #1, #3–#6, #12, #13 accepted as documented; #10 deferred to Phase 6)

### Performance

1. **No index on `idol_career(group_id)` — skip for now (speculative).** The PK is `(idol_id, group_id)`, so every group-side join in `get_overview` / `get_group_page` / `_get_completed_group_ids` seq-scans `idol_career`. At current volume (tens of groups, hundreds of career rows) a seq scan beats index access; adding the index now is premature. *Recommendation: don't add; revisit with `EXPLAIN ANALYZE` only if collection reads ever show up slow.*
2. **`idx_user_cards_user_id` is redundant — drop opportunistically.** `uq_user_card UNIQUE (user_id, card_id)` already provides a btree with `user_id` as the leading column, covering every `user_id` probe. The extra index only adds write overhead. ✅ **Implemented:** dropped in migration 026 (which adds `groups.image_path`).
3. **No query restructure needed.** All hot lookups are covered: idol cards by `uq_member_card` (partial, matches the `card_type='idol'` filter), group_photo cards by `uq_group_card`, ownership probes by `uq_user_card`, `resolve_user_id` by the `users.token UNIQUE` index. `get_overview` is one aggregate query per page load over a small catalog. *Recommendation: no action.*

### Security

4. **No SQL injection surface — confirmed.** Every service/route query is parameterized; `group_id` is typed by Flask's `<int:>` converter; the seed scripts interpolate only developer-controlled table/column names and are not request-reachable. *No action.*
5. **`resolve_user_id` / anonymous lookup — safe as built.** `detect_user()` only enters the anonymous branch after `_is_uuid` validates the header shape, the lookup is parameterized against a UNIQUE index, and UUIDv4's 122 random bits make token enumeration infeasible. Identical trust model to the guess routes. Failed resolution degrades to `user_id=None` (public catalog), never an error or another user's data. *No action.*
6. **Cross-collection reads are impossible today; guard the future.** `collection_id` is a server-side default (1) — no request input reaches it, and the `is_eligible = TRUE` filters gate unpublished pages (404). When Collection 2 adds a client-supplied `collection_id`, validate it (int + existence + per-collection read policy, e.g. seasonal may require auth). *Recommendation: note only; enforce when the param is exposed.*

### Reliability / edge cases

7. **Isolate the grant hook with a SAVEPOINT — top recommendation.** An exception inside `grant_card_for_win` would abort the whole `save_user_history` transaction: the user's win, score, and streak roll back because a decorative side-feature failed. A bare `try/except` is NOT enough — psycopg poisons the transaction after any errored statement. ✅ **Implemented:** `SAVEPOINT collection_grant` → on exception `ROLLBACK TO SAVEPOINT` + `logger.exception` → the win still commits (§3.2).
8. **Route handlers swallow exceptions blind.** ✅ **Implemented:** both handlers now `logger.exception` before returning the generic 500.
9. **`get_group_page` response lacks `group_name`.** The frontend group page needs a title without depending on the overview cache (fragile on deep-link/refresh). ✅ **Implemented:** `get_group_page` returns `group_name` (dedicated `groups` lookup after the roster query).
10. **Overview has no collection-wide totals.** `CollectionProgress` (§6) wants distinct owned/total counts; per-page sums overcount multi-page idols, and the client cannot dedupe (it doesn't know which idols repeat across pages). *Recommendation: when Phase 6 starts, either add a small totals query to the overview endpoint or drop the header component; decide then.*
11. **Eligible-but-cardless pages vanish.** A group flipped `is_eligible` before its idols are published/carded is absent from the overview and 404s on its page (INNER JOIN through `cards`). Consistent, but operationally surprising mid-publish. ✅ **Implemented (warning half):** `seed_collection_cards.py` prints a warning per eligible zero-card page; the vanish behavior itself stays as documented.
12. **Same-day concurrent double-win race — accept.** Two simultaneous first-win submissions can both pass `already_won_today` and both grant → the second becomes a level-up (level 2 on day one). Requires duplicate wins in-flight within milliseconds; consequence is cosmetic. *Recommendation: no action; documented.*
13. **`COLLECTION_ENABLED` is read once at import — testing consequence.** The hook check uses the value imported into `game_service`'s namespace, so tests toggle it via `monkeypatch.setattr("services.game_service.COLLECTION_ENABLED", False)`. Blueprint registration in `app.py` is also import-time — the "routes 404 when flag off" state can't be toggled per-test in-process (see §7b T25). *Recommendation: accept; no code change.*
14. **Uncommitted debug line in `routes/games/classic.py`** — `idol_id = 1` (the testing override) was active in the working tree, pinning the daily idol. ✅ **Resolved:** reverted (verified via `git diff`).

---

## 5. Backfill Script (`backfill_collection_cards.py`, backend root) — ✅ IMPLEMENTED (real run pending launch)

Standalone, manual, **one-time before public launch**. NOT a migration. Walks history and replays every win through the **same `CollectionService.grant_card_for_win()`** used by the live path — no duplicate INSERT logic anywhere.

- Source query (wins only, ALL users — anonymous and registered):
  ```sql
  SELECT duh.user_id, duh.date, duh.won_at, dp.idol_id
  FROM daily_user_history duh
  JOIN daily_picks dp
       ON dp.pick_date = duh.date AND dp.gamemode_id = duh.gamemode_id
  WHERE duh.won = TRUE
    AND duh.gamemode_id IN (1, 2)          -- COLLECTION_GAMEMODE_IDS
    AND dp.idol_id IS NOT NULL
  ORDER BY duh.user_id, duh.date ASC
  ```
- For each row: `grant_card_for_win(cursor, user_id, idol_id, won_at or midnight-of-date)` — chronological order per user so `first_won_at` and evolution levels come out historically correct; bonus unlocks fire automatically through the same code path. Replaying through the real grant also reconstructs `times_won` correctly (every historical win increments it, capped `level` or not).
- **`--dry-run`**: runs the entire replay inside one transaction and issues `ROLLBACK` at the end, printing what would happen (users touched, new cards, level-ups, bonus unlocks, non-collectible wins skipped). This exercises the real code path instead of a parallel "counting" implementation. Real run: single `COMMIT` at the end (all-or-nothing).
- **Double-run guard**: aborts if `user_cards` is non-empty unless `--force` is passed, because level/times_won increments are not idempotent (replaying wins on top of existing ownership would double-level cards). Documented as: *run once, before launch, after the catalog script and after publishing the launch set of pages*. If more pages are published later, past wins of newly carded idols are not retro-granted by default — see Q6.
- Requires the launch pages published first (idols without card rows are skipped by design).

---

## 6. Frontend Architecture — PENDING

No visual design here (per scope) — components and data flow only. Visual language comes later from `DESIGN.md` (sticker/washi/polaroid motifs are a natural fit) unless the user directs a divergence.

> **Deviation flagged:** the Collection is a **page, not a game mode**. It has no daily state, no guesses, no `gamemode_id`. So — unlike the "Adding a New Game Mode" recipe — we do **not** extend the `GameMode` union, the `MODES` map in `api.ts`, or `useClearGameStorage` (no per-day localStorage state exists; everything is server-side). It follows the `pages/Idols/` shape instead (list page + detail page).

> **Depends on the §3.2 pending task:** the win celebration below reads `card_granted` from the guess response — that field doesn't exist yet.

### Files & structure

```
src/pages/Collection/
├── CollectionOverview.tsx      — /collection: album cover + all group pages with progress
├── CollectionGroupPage.tsx     — /collection/:groupId: roster grid + bonus slot + completion count
└── components/                 — page-scoped subcomponents:
    ├── GroupProgressCard.tsx   — one group tile on the overview (name, owned/total, bonus badge)
    ├── MemberCardSlot.tsx      — one roster slot: owned (image + level pips) vs empty state
    ├── BonusCardSlot.tsx       — the group-photo slot: locked / unlocked
    └── CollectionProgress.tsx  — overall completion header (see §4b #10 — needs endpoint totals or gets dropped)
```
(PascalCase filenames match the newest pages — `PixelatedMode.tsx`, `IdolsList.tsx`.)

### Routing (`main.tsx`), flag-gated exactly like the admin route

```tsx
{import.meta.env.VITE_COLLECTION_ENABLED === "true" && (
  <>
    <Route path="/collection" element={<CollectionOverview />} />
    <Route path="/collection/:groupId" element={<CollectionGroupPage />} />
  </>
)}
```
Flag off → the catch-all `*` route already redirects to home. Nav entry added in `components/NavBar/navigation.ts` (new `COLLECTION_LINKS` or an entry alongside `IDOLS_LINKS`), rendered only when the flag is on.

### API layer (`services/api.ts`)

```ts
export const getCollectionOverview = async (): Promise<CollectionGroupSummary[]> => {
    const encrypted = localStorage.getItem('userToken');
    const token = encrypted ? await decryptToken(encrypted) : null;
    const response = await api.get('/collection/overview', {
        headers: token && !getAccessToken() ? { 'Authorization': token } : {}
    });
    return response.data;
};

export const getCollectionGroupPage = async (groupId: number): Promise<CollectionGroupDetail> => { /* same header pattern, GET /collection/groups/${groupId} */ };
```
Anonymous-compatible pattern from `getDailyIdol`, with one refinement: the bare-UUID header is only attached when **no JWT access token** is in memory, so authenticated users resolve via their JWT (the request interceptor's `Bearer` header) and anonymous users via the UUID.

Note the as-built shapes: the overview is a **bare array** (no wrapper object), and the group page is `{group_id, members, group_photo}` with **no `group_name`** — either take the name from the overview cache or extend the endpoint first (§4b #9, recommended).

### Types (`interfaces/gameInterfaces.ts`)

`CollectionGroupSummary` (`group_id, group_name, total_idol_cards, owned_idol_cards, has_bonus_cover, bonus_owned`), `CollectionMemberCard` (`idol_id, artist_name, card_id, image_path, owned, level, first_won_at`), `CollectionBonusCard` (`card_id, image_path, owned`), `CollectionGroupDetail` (`group_id, members, group_photo`) — mirroring §3.3 one-to-one — plus `CardGranted` (`{ card_id, is_new, level, times_won, group_photo: number[] } | null`), added to the Classic/Blurry guess-response types once the §3.2 pending task lands.

### Win celebration (Q3 — pending §3.2 task)

The Classic/Blurry win handlers read `card_granted` **directly from the guess response** and pass it into the win-celebration flow (rendered alongside the existing victory card — e.g. a `CardGrantedReveal` component slot under `pages/Collection/components/`, reusable by both modes). Gated by `VITE_COLLECTION_ENABLED`; when the flag is off or `card_granted` is `null`, the celebration renders exactly as today. Final visuals are out of scope (per §9) — this plan only wires the data path and the component slot.

### React Query keys

- `["collectionOverview"]` — overview page
- `["collectionGroup", groupId]` — per-group page (per-entity key, same convention as `["pixelatedDailyAlbum", gameMode]`)
- Ownership is per-user: after a **winning** Classic/Blurry guess, the win handler *additionally* calls `queryClient.invalidateQueries({ queryKey: ["collectionOverview"] })` + `["collectionGroup"]` — the celebration is driven by `card_granted` from the response (above), and the invalidation keeps `/collection` consistent if the user navigates there afterward. Auth transitions already reload the app (`safeReload`), which clears the cache.

### Feature flag summary

| Layer | Flag | Effect when off |
|---|---|---|
| Backend `app.py` | `COLLECTION_ENABLED` | `collection_bp` never registered → routes 404 |
| Backend `game_service.py` | `COLLECTION_ENABLED` (module constant in `collection_service.py`) | grant hook is a no-op; win flow byte-identical to today |
| Frontend `main.tsx` + NavBar | `VITE_COLLECTION_ENABLED` | routes not mounted, nav link hidden |

---

## 7. Implementation Checklist (ordered)

### Phase 1 — Backend schema ✅
- [x] 1. Create `kpopit-backend/migrations/025_add_albums_collection.sql` with the §2 schema (DDL only, `BEGIN/COMMIT`, `IF NOT EXISTS`, named constraints, partial unique indexes).
- [x] 2. Run `python migrations/migrations.py` against the dev DB; verify all four tables + partial unique indexes exist.
- [x] 3. Add the four new tables to `TRUNCATE_SQL` in `kpopit-backend/tests/conftest.py` (+ `SEED_COLLECTIONS_SQL`) and apply the migrations to the `kpopit_test` DB (024–026 applied 2026-07-11).
- [x] 3b. Migration `026_add_group_image_path.sql`: `groups.image_path` (Q7 Option A) + drop redundant `idx_user_cards_user_id` (§4b #2). Applied to dev + test DBs.

### Phase 2 — Seeding ✅
- [x] 4. Seed `collections` + `collection_group_eligibility` from `data/collections.csv` / `data/collection_group_eligibility.csv` via `seed_db.py`; create `kpopit-backend/seed_collection_cards.py` (§4): one idol card per distinct published idol on eligible pages, group_photo cards for `has_bonus_cover` eligible pages, per-step insert counts + cardless-page warning. `groups.csv` gained the `image_path` column.
- [x] 5. Run `seed_collection_cards.py` twice against dev DB: idempotent (both runs 0 inserts on the seeded catalog) and no idol has more than one card row (spot-checked via SQL). Fresh-catalog creation paths are covered by the §7b test suite.

### Phase 3 — Domain service ✅
- [x] 6. Create `kpopit-backend/services/collection_service.py`: `COLLECTION_ENABLED` + `COLLECTION_GAMEMODE_IDS = (1, 2)` + `LEVEL_CAP = 3` constants, `grant_card_for_win` (+ `_insert_new_card`, `_upgrade_card_level`, `_get_completed_group_ids`, `_insert_group_photo_card`, `_grant_completed_group_photos`), `get_overview`, `get_group_page` (§3.1) — no commits inside.
- [x] 7. Hook `GameService.save_user_history` (§3.2) inside the `not already_won_today` block, guarded by flag + gamemode, isolated with `SAVEPOINT collection_grant` (§4b #7).
- [x] 8. **Re-surface `card_granted`:** hook captures the grant dict, `save_user_history` returns `(is_correct, card_granted)`, all three call sites updated (`classic.py` + `blurry.py` add `"card_granted"` to the guess response; `AlbumService.process_guess` discards it).
- [x] 9. Write `kpopit-backend/tests/test_collection.py` per the §7b Test Plan; full backend suite green (53 passed: 24 collection + 29 pixelated, 2026-07-11).

### Phase 4 — Routes ✅
- [x] 10. Create `kpopit-backend/routes/collections/collection.py`: `collection_bp`, `resolve_user_id`, the two GET endpoints (§3.3) with `@optional_auth`, thin-route + `try/finally` convention, `logger.exception` on failure.
- [x] 11. Register `collection_bp` in `app.py` under `/api`, gated by `COLLECTION_ENABLED`; env var in backend `.env` (dev value `true`).
- [x] 12. Endpoint tests per §7b T21–T25.

### Phase 4b — Cleanup ✅
- [x] 12a. Delete dead `kpopit-backend/data/cards.csv` (§4).
- [x] 12b. Revert the `idol_id = 1` debug line in `kpopit-backend/routes/games/classic.py` (verified via `git diff`).

### Phase 5 — Backfill script ✅ (real run reserved for launch)
- [x] 13. Create `kpopit-backend/backfill_collection_cards.py` (§5): chronological replay through `grant_card_for_win`, `--dry-run` (transaction + rollback + report), non-empty `user_cards` guard with `--force`, single final commit.
- [x] 14. Verified on dev DB (2026-07-11): guard aborts on non-empty `user_cards`; `--dry-run --force` replayed 4,467 wins (398 new cards, 107 level-ups, 14 bonus unlocks, 3,962 non-collectible skips) and rolled back; launch runbook documented at the top of the script. **The real (committing) run happens at launch, after publishing the launch pages.**

### Phase 6 — Frontend
- [ ] 15. Add types to `src/interfaces/gameInterfaces.ts` (§6 collection payloads + `CardGranted` on the guess-response types); add `getCollectionOverview` / `getCollectionGroupPage` to `src/services/api.ts` (anonymous-header pattern, §6).
- [ ] 16. Create `pages/Collection/CollectionOverview.tsx` + `components/` (GroupProgressCard, CollectionProgress) with `useQuery(["collectionOverview"])`.
- [ ] 17. Create `pages/Collection/CollectionGroupPage.tsx` + MemberCardSlot / BonusCardSlot with `useQuery(["collectionGroup", groupId])`; handle 404 → redirect to `/collection`.
- [ ] 18. Register both routes in `main.tsx` gated by `VITE_COLLECTION_ENABLED`; add the nav entry in `components/NavBar/navigation.ts` (flag-gated); add the env var to frontend `.env`.
- [ ] 19. Wire `card_granted` from the guess response into the Classic/Blurry win-celebration flow (`CardGrantedReveal` slot, flag-gated, §6) **and** invalidate collection queries on winning guesses. (Requires checklist item 8.)
- [ ] 20. `npm run build` + `npm run lint` clean; manual pass with flag on and off.

### Phase 7 — Flag wiring & docs
- [ ] 21. Verify the full off-state: both flags off → no routes, no nav, no grant writes, win flow identical to production today.
- [ ] 22. Update `CLAUDE.md`: env-var tables (`COLLECTION_ENABLED`, `VITE_COLLECTION_ENABLED`), schema highlights (four new tables, card-per-idol design), and a short "Collection system" architecture note; check off this plan's boxes as phases completed.

---

## 7b. Test Plan — Collection feature ✅ (implemented 2026-07-11 — `tests/test_collection.py`, 24 tests, all green)

All tests live in `kpopit-backend/tests/test_collection.py`, using the existing conftest scaffolding (session `app`, `client`, `db_conn`, autouse `reset_db` truncation, `make_user`, `make_group`). Run with `pytest kpopit-backend/tests -v`; `test_pixelated.py` must stay green.

### Fixtures (`tests/conftest.py`)
- [x] T1. Add `collections, collection_group_eligibility, cards, user_cards` to `TRUNCATE_SQL` explicitly (today only implicit CASCADE via users/groups/idols covers three of them; `collections` is never reset).
- [x] T2. Add `SEED_COLLECTIONS_SQL` (`INSERT INTO collections (id, name) VALUES (1, 'Album 1') ON CONFLICT (id) DO NOTHING`) to `reset_db`, mirroring `SEED_GAMEMODES_SQL`.
- [x] T3. New fixtures: `make_idol` (published `idols` row), `make_career(idol_id, group_id)`, `make_eligible_group(group_id, is_eligible=True, has_bonus_cover=True)`, `make_card(idol_id=… | group_id=…, card_type)` — plus a composed `collection_page` fixture building group + N idols + careers + cards in one call.

### `CollectionService` — grant paths (service-level, real DB)
- [x] T4. New card: `grant_card_for_win` → row with `level=1, times_won=1, first_won_at=passed timestamp`; returns `is_new: True`.
- [x] T5. Level-up: second grant → `level=2, times_won=2`, `is_new: False`; `first_won_at` unchanged.
- [x] T6. Capped: grants beyond `LEVEL_CAP` → `level` stays 3, `times_won` keeps incrementing (4, 5, …).
- [x] T7. Idol with no card row → returns `None`, zero `user_cards` writes.

### `CollectionService` — group_photo unlock
- [x] T8. Completing a page's last idol card → result `group_photo` contains the group id and the bonus `user_cards` row exists.
- [x] T9. Multi-group idol whose win completes TWO pages at once → both group ids granted (single-card design consequence, §1).
- [x] T10. Bonus re-grant is a no-op (`DO NOTHING`) — completing an already-bonused page grants nothing new.
- [x] T11. `has_bonus_cover = FALSE` page (Soloist) never unlocks a bonus even when complete.
- [x] T12. Eligible bonus page whose `group_photo` card row is missing → no grant, no error.
- [x] T13. Multi-stint idol (two `idol_career` rows, same group) doesn't break the completion count (`COUNT(DISTINCT …)`).

### `CollectionService` — read shapes
- [x] T14. `get_overview`: per-group rows carry `group_id, group_name, total_idol_cards, owned_idol_cards, has_bonus_cover, bonus_owned`; a multi-stint idol counts once; `bonus_owned` flips after unlock.
- [x] T15. `get_overview` with `user_id=None` → full catalog, all owned counts 0, `bonus_owned` false.
- [x] T16. `get_group_page`: multi-stint idol appears once (`DISTINCT ON` regression test); `image_path` falls back to `idols.image_path` when card art is NULL; `group_photo` is `None` for a no-bonus page; unknown/ineligible group → `None`.

### Hook (`save_user_history`) — through the real guess flow
- [x] T17. Winning Classic guess (flag on, carded idol) → one `user_cards` row; a second correct submission the same day does NOT re-grant (`times_won` unchanged — `already_won_today` guard).
- [x] T18. Blurry (gamemode 2) win grants; Pixelated (gamemode 3) win writes nothing to `user_cards`.
- [x] T19. Flag off — `monkeypatch.setattr("services.game_service.COLLECTION_ENABLED", False)` (the hook checks the value imported into `game_service`'s namespace, NOT the env var) → win recorded, `user_cards` untouched.
- [x] T20. Losing guess grants nothing.

### Routes (`test_client`)
- [x] T21. `GET /api/collection/overview` with anonymous UUID `Authorization` header → owned counts reflect that user's cards (regression test for the fixed anonymous-ownership bug).
- [x] T22. Same endpoint with a JWT `Bearer` token → ownership resolves via `g.auth["user_id"]`.
- [x] T23. No/garbage `Authorization` header → 200, catalog with zero ownership (never a 401/500).
- [x] T24. `GET /api/collection/groups/<id>` for an eligible page → 200 with `{group_id, members, group_photo}`; ineligible or unknown id → 404.
- [x] T25. Flag-off blueprint gating: NOT per-test toggleable (registration happens at `app.py` import, and conftest imports `app` once per session). Cover the off-state at the hook level (T19) and verify route absence manually / in the §7 item 21 flag-off regression pass — do not attempt to re-import the app inside a test.

---

## 8. Files Created / Modified

**Created — backend**
| File | Status | Purpose |
|---|---|---|
| `kpopit-backend/migrations/025_add_albums_collection.sql` | ✅ done | Four collection tables + indexes/constraints |
| `kpopit-backend/data/collections.csv` | ✅ done | `collections` seed row (id=1, "Album 1") |
| `kpopit-backend/data/collection_group_eligibility.csv` | ✅ done | Per-group eligibility + bonus flags |
| `kpopit-backend/seed_collection_cards.py` | ✅ done | Derived card catalog (idol + group_photo cards) |
| `kpopit-backend/services/collection_service.py` | ✅ done | Grant + bonus + read logic, flag/gamemode/cap constants |
| `kpopit-backend/routes/collections/collection.py` | ✅ done | `resolve_user_id`, `GET /api/collection/overview`, `GET /api/collection/groups/<id>` |
| `kpopit-backend/backfill_collection_cards.py` | ✅ done | One-time historical win replay (`--dry-run`/`--force`, runbook in header) |
| `kpopit-backend/tests/test_collection.py` | ✅ done | §7b service + hook + route tests (24 tests) |
| `kpopit-backend/migrations/026_add_group_image_path.sql` | ✅ done | `groups.image_path` (Q7 Option A) + drop redundant `idx_user_cards_user_id` |

**Created — frontend (all pending)**
| File | Purpose |
|---|---|
| `src/pages/Collection/CollectionOverview.tsx` | Album overview page |
| `src/pages/Collection/CollectionGroupPage.tsx` | Group roster page |
| `src/pages/Collection/components/GroupProgressCard.tsx` | Overview group tile |
| `src/pages/Collection/components/MemberCardSlot.tsx` | Roster slot (owned/empty + level) |
| `src/pages/Collection/components/BonusCardSlot.tsx` | Group-photo slot (locked/unlocked) |
| `src/pages/Collection/components/CollectionProgress.tsx` | Completion header (see §4b #10) |
| `src/pages/Collection/components/CardGrantedReveal.tsx` | Card-granted slot in the win celebration (flag-gated) |

**Modified**
| File | Status | Change |
|---|---|---|
| `kpopit-backend/services/game_service.py` | ✅ done | Flag-gated, SAVEPOINT-isolated grant hook in `save_user_history`; returns `(is_correct, card_granted)` |
| `kpopit-backend/seed_db.py` | ✅ done | Seed `collections` + `collection_group_eligibility` from CSVs; `groups.image_path` column |
| `kpopit-backend/data/groups.csv` | ✅ done | New `image_path` column (empty until curated) |
| `kpopit-backend/app.py` | ✅ done | Conditional `collection_bp` registration (`COLLECTION_ENABLED`) |
| `kpopit-backend/routes/games/classic.py` | ✅ done | Debug line reverted; `"card_granted"` in guess response |
| `kpopit-backend/routes/games/blurry.py` | ✅ done | `"card_granted"` in guess response |
| `kpopit-backend/services/album_service.py` | ✅ done | Unpacks new return, discards `card_granted` (response unchanged) |
| `kpopit-backend/tests/conftest.py` | ✅ done | New tables in `TRUNCATE_SQL`; `SEED_COLLECTIONS_SQL`; collection fixtures + `make_access_jwt` |
| `kpopit-backend/data/cards.csv` | ✅ deleted | Dead file (§4) |
| `src/services/api.ts` | pending | Two collection API functions |
| `src/interfaces/gameInterfaces.ts` | pending | Collection payload types + `CardGranted` |
| `src/main.tsx` | pending | Flag-gated `/collection` + `/collection/:groupId` routes |
| `src/components/NavBar/navigation.ts` | pending | Flag-gated Collection nav entry |
| `src/pages/ClassicMode/…` + `src/pages/BlurryMode/…` (win handlers) | pending | Read `card_granted` → celebration; invalidate collection queries on win |
| `CLAUDE.md` | pending | Env vars, schema highlights, architecture note |
| Backend/Frontend `.env` | ✅ backend / pending frontend | `COLLECTION_ENABLED` / `VITE_COLLECTION_ENABLED` |

**Explicitly NOT touched:** `AlbumService`/`IdolService` grant logic (the hook lives in the shared `save_user_history`), `useGameMode` / `MODES` map / `useClearGameStorage` (not a game mode), scoring/streak logic, `daily_picks`/`daily_user_history` schema.

---

## 9. Explicit Non-Goals

- **No Collection 2 (seasonal/gacha).** `collections.id = 2` is reserved conceptually — no row seeded, no rarity/variant/fragment/trading schema, no design. Its future card table (where group/era IS part of card identity, and every card — including any group-level ones — requires deliberately curated art, no fallback chain) is separate and does not retrofit onto Album 1's `cards`.
- **No auth-gating for Album 1.** Anonymous UUID users collect identically to registered users; the only auth distinction left for Collection 2 is that everything is keyed by `collection_id` so a future mode can add `@require_auth` on its own routes.
- **No final visual design.** Component/data architecture only; visuals come later under `DESIGN.md` (or an intentional divergence if the user asks).
- **No "play previous days" feature.** Mentioned only as future context for why card evolution exists; nothing built.
- **No card image pipeline/admin UI.** Schema has `image_path`; sourcing/uploading is the developer's manual curation for now (idol cards fall back to `idols.image_path` meanwhile).

---

## 10. Open Questions — ALL RESOLVED (user, 2026-07-07) — & Assumptions

**Q1 — Level cap: 3. ✅ RESOLVED.** `LEVEL_CAP = 3` constant + DB CHECK `BETWEEN 1 AND 3`. Applies only to Album 1's `cards`/`user_cards` — the future seasonal Collection uses a completely different mechanic (rarity + fragments, no level/cap concept). As built, `times_won` counts on past the cap.

**Q2 — Pixelated (gamemode 3) does not grant cards. ✅ RESOLVED, no change.** A future "album of albums" collection may cover Pixelated wins, but that's a separate, unplanned system — not this one, and not the seasonal Collection either.

**Q3 — `card_granted` in the guess response: ✅ RESOLVED — included, but not yet shipped.** Granting happens inside `save_user_history` at guess-time (done); the return-contract change and response field are a **pending task** (re-confirmed 2026-07-11 after the initial implementation discarded the return value — see §3.2). Response shape: `{card_id, is_new, level, times_won, group_photo: [group_id, …]} | null`.

**Q4 — Catalog filters unpublished idols (`idols.is_published = TRUE`). ✅ RESOLVED: confirmed, implemented in `seed_collection_cards.py`.** Unpublished idols can never be a daily answer, so their card slots would be unobtainable and would block page bonuses forever. Re-running the script after publishing an idol adds their card.

**Q5 — `collection_group_eligibility` PK: ✅ RESOLVED — natural composite `(collection_id, group_id)`, no surrogate `id`.** Implemented as planned; the CSV seeding's conflict key targets the PK directly.

**Q6 — Pages/idols published after the backfill. ✅ RESOLVED: accepted limitation for launch.** Wins that predate an idol's card creation are not retro-granted (backfill is one-time; the live grant skips idols without card rows). Publishing the full launch set of pages *before* the backfill makes it moot, and the bonus-check self-heal (§3.1 step 4) mitigates going forward.

**Q7 — group_photo card art source. ✅ RESOLVED (user, 2026-07-11): Option A, implemented.** Migration `026_add_group_image_path.sql` adds `groups.image_path` (CSV-seeded via `groups.csv`); the group_photo query uses `COALESCE(c.image_path, g.image_path)`. Curated art still overrides via `cards.image_path`, exactly like idol cards.

**Assumptions**
- **A1 (superseded as built):** originally, a page would only be published once all its card art was curated. As built, idol cards `COALESCE` to `idols.image_path` and group_photo cards to `groups.image_path` (Q7), so pages can go `is_eligible` before curation and never render image-less slots.
- **A2:** Card images will live in the existing R2 bucket structure; `cards.image_path` stores a relative path like `idols.image_path` does. No upload tooling in this plan.
- **A3:** `first_won_at` uses the same timestamp source as `won_at` (`get_current_timestamp()` from `utils/dates.py`) on the live path and historical `won_at` in the backfill.
- **A4:** Bonus cards keep `level = 1` in `user_cards` (column unused for them; binary semantics enforced by `DO NOTHING` on re-grant) — no separate ownership table for bonus cards.
- **A5:** One win can unlock multiple page bonuses simultaneously (single-card design consequence, §3.1 step 4) — accepted and intended.
- **A6:** Overview/group endpoints are unauthenticated-readable (catalog is public data; ownership overlays only with a valid identity). No rate-limit decorators beyond Flask-Limiter's defaults, matching other game GET routes.

---

## Verification (for the remaining implementation phases)

1. **Backend:** `pytest kpopit-backend/tests -v` — new `test_collection.py` (§7b) plus the untouched `test_pixelated.py` suite green.
2. **Seeding:** run `seed_collection_cards.py` twice (second run = 0 inserts); confirm a multi-group idol has exactly one card row (§7 item 5).
3. **End-to-end (flag on, after the §3.2 card_granted task):** win a Classic game as an anonymous user → one `user_cards` row at level 1 **and** the guess response carries `card_granted` (`is_new: true, level: 1, times_won: 1`); win again next (offset) day via `TEST_MODE`/`TEST_DATE_OFFSET` → level 2; complete a small test page → group_photo card appears and `group_photo` lists the group; verify the same idol's card shows as owned on *every* page she appears on; `/collection` UI reflects all of it without reload after a win.
4. **Backfill:** `--dry-run` report vs. hand-counted expected grants on a dev DB copy; real run; guard blocks a second run.
5. **Flag-off regression:** both flags off → guess flow, routes, and UI byte-identical to today (no `user_cards` writes, 404 on collection routes, no nav entry).
