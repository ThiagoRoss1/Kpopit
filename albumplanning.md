# Album 1 Collection System — Implementation Plan

> **Status: APPROVED (2026-07-07). All §10 open questions resolved — answers recorded in §10.**
> During implementation, check off steps (`- [x]`) as each phase completes.

## 1. Feature Summary

A **sticker-album collection system** layered on top of the existing daily games. Winning a daily challenge grants the user exactly one card. Cards live in a catalog organized as a World-Cup-style album: one page per group ("team"), showing a member card slot per idol on that page, plus an unlockable bonus "group photo" card when a page is completed.

**Two-collection context:**
- **Collection 1 — "Album 1" (this plan):** fixed roster derived from `idol_career` (full history, not just active memberships), no rarity, no randomness, no auth requirement — anonymous UUID users collect exactly like registered users. Repeat wins of the same idol **evolve** the card (`level`, capped) instead of duplicating it.
- **Collection 2 — seasonal/gacha (out of scope):** reserved conceptually as `collections.id = 2`. Rarity tiers, photo variants, fragments/crafting, trading, and its auth requirement are **not designed or built here**. That system will have its own card table where group/era IS part of a card's identity — do not conflate the designs. The only accommodation in this plan: everything is keyed by `collection_id`, so Collection 2 adds rows/tables, not schema rework.

**Core rules (locked):**
- **A member card belongs to an idol, period** — "you've guessed this idol," not "…as a member of group X." One card and one ownership record per idol per collection. Which group pages display that card is resolved at query time via `idol_career`; `group_id` is stored only on bonus cards.
- One win → one card. There is no page-resolution ambiguity: the win's idol maps to exactly one card.
- Repetition = evolution: same idol again → `level + 1` up to a low cap; no duplicate rows.
- Page membership uses **full `idol_career` history** — an idol who left a group still appears (with her single card) on that group's page, alongside her current group/solo page.
- `group_id = 20` is the real "Soloist" group row (confirmed: `groups.csv` row `20,Soloist,...` and `albums_soloist_check` in migration 022). It is a normal page with `has_bonus = false` — no schema special-casing.
- Bonus "group photo" card: unlocked automatically when every member card shown on a `has_bonus = true` page is owned. No `idol_id`, no level — binary owned/not-owned. **Consequence of the single-card design (flagged):** one card counts toward every page the idol appears on, so a single win can complete — and unlock the bonus for — more than one page at once. The bonus check therefore scans *all* of the idol's eligible pages.
- Cards have their own curated `image_path`, independent of `idols.image_path`.
- Feature-flagged from day one: `COLLECTION_ENABLED` (backend) / `VITE_COLLECTION_ENABLED` (frontend).

---

## 2. Finalized Schema — Migration `025_add_collections.sql`

Next free migration number confirmed as **025** (folder ends at `024_remove_id_from_blurry_mode_data.sql`). Style follows existing migrations: `BEGIN;` … `COMMIT;`, `IF NOT EXISTS`, named constraints (runner is `migrations/migrations.py`, applied in filename order, recorded in `schema_migrations`).

```sql
/* Album 1 Collection system — collections, group pages, card catalog, ownership */

BEGIN;

-- Root table: which collections exist.
-- Rows are seeded by the catalog population script (not here), mirroring how
-- gamemodes/groups are seeded outside migrations. id=2 (seasonal) is reserved
-- conceptually but NOT created.
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Which groups have a page in which collection, and whether that page has a
-- completion bonus. is_published gates page visibility and card creation.
-- Natural composite PK (Q5): nothing references this table by FK, and
-- (collection_id, group_id) is already the lookup key — same rationale as
-- the 024 blurry_mode_data cleanup.
CREATE TABLE IF NOT EXISTS collection_group_eligibility (
    collection_id INTEGER NOT NULL REFERENCES collections(id),
    group_id INTEGER NOT NULL REFERENCES groups(id),
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    has_bonus BOOLEAN NOT NULL DEFAULT TRUE,

    PRIMARY KEY (collection_id, group_id)
);

-- Card catalog — what exists to collect.
-- member cards: identified by (collection_id, idol_id); group_id is NULL.
--   Which group pages display a member card is a read-time join through
--   idol_career — group is NOT part of a member card's identity in Album 1.
-- group_photo cards: identified by (collection_id, group_id); idol_id is NULL
--   (the bonus card belongs to the group entity, not to any single idol).
CREATE TABLE IF NOT EXISTS cards (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER NOT NULL REFERENCES collections(id),
    idol_id INTEGER REFERENCES idols(id),
    group_id INTEGER REFERENCES groups(id),
    card_type TEXT NOT NULL DEFAULT 'member',
    image_path TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_cards_card_type CHECK (card_type IN ('member', 'group_photo')),
    CONSTRAINT chk_cards_identity CHECK (
        (card_type = 'member'      AND idol_id IS NOT NULL AND group_id IS NULL) OR
        (card_type = 'group_photo' AND idol_id IS NULL     AND group_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_member_card
    ON cards (collection_id, idol_id) WHERE card_type = 'member';
CREATE UNIQUE INDEX IF NOT EXISTS uq_group_photo_card
    ON cards (collection_id, group_id) WHERE card_type = 'group_photo';

-- Ownership — what each user has collected. level is meaningful for member
-- cards only; bonus cards stay at 1 (binary owned/not-owned).
CREATE TABLE IF NOT EXISTS user_cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    card_id INTEGER NOT NULL REFERENCES cards(id),
    level INTEGER NOT NULL DEFAULT 1,
    first_won_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_user_card UNIQUE (user_id, card_id),
    CONSTRAINT chk_user_cards_level CHECK (level BETWEEN 1 AND 3)
);

CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON user_cards (user_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_card_id ON user_cards (card_id);

COMMIT;
```

### Changes vs. the (revised) proposed schema, flagged for review

1. **CHECK constraints added** — `card_type IN ('member','group_photo')`, the member/group_photo identity constraint (`idol_id` XOR `group_id`, matching the revised design exactly), and `level BETWEEN 1 AND 3`. Same convention as `albums_soloist_check`; catches service bugs at the DB layer for free.
2. **`created_at` columns added** to `collections` and `cards`, matching `albums`/`users` convention.
3. **Level cap set to 3 in the constraint** (Q1 resolved: 3). The cap enforced in code is a `CollectionService.LEVEL_CAP = 3` constant; the CHECK is the safety net. Album-1-only concept — the future seasonal Collection uses rarity + fragments, no level/cap.
4. **`collections` seed row moved out of the migration** into the catalog population script (`INSERT … ON CONFLICT (id) DO NOTHING`), keeping the migration DDL-only like every existing migration; reference data lives in the seed/population layer (like `gamemodes.csv`).
5. **No extra index on `cards` needed** — the two partial unique indexes already cover the only lookups (member card by `(collection_id, idol_id)`, bonus card by `(collection_id, group_id)`); `user_cards` gets indexes on both FKs.
6. **`user_cards.first_won_at` gets a default** but the service always passes it explicitly (live path: the win's `current_timestamp`; backfill: the historical `won_at`).
7. **Kept `SERIAL id` on `cards` and `user_cards`** despite the recent 024 trend of dropping surrogate ids: `user_cards` needs a stable `card_id` FK target, and member vs. bonus cards have different natural keys, so a surrogate PK is the right call there. **`collection_group_eligibility` uses the natural composite PK `(collection_id, group_id)`** (Q5 resolved) — nothing references it by FK, matching the 024 `blurry_mode_data` cleanup. All §3/§4 queries already look it up by `(collection_id, group_id)`; the population script's `ON CONFLICT (collection_id, group_id)` targets the PK directly.

---

## 3. Backend Domain Logic

### 3.1 `CollectionService` (new, `services/collection_service.py`)

Follows the `AlbumService` pattern exactly: constructed with the connection, receives `cursor`/`connect` per call, **never** calls `get_db()`, never commits inside grant logic (the caller owns the commit). Module-level `COLLECTION_ENABLED = os.getenv("COLLECTION_ENABLED", "false").lower() == "true"` read once at import (same convention as `RESEND_EMAIL_FRONTEND_URL`), plus `COLLECTION_GAMEMODE_IDS = (1, 2)` and `LEVEL_CAP = 3`.

**`grant_card_for_win(cursor, user_id, idol_id, won_at, collection_id=1) -> dict | None`**

Resolves and grants the idol's single card. No group is involved in resolution — `card_id` comes from `(collection_id, idol_id)` alone:

1. Resolve the card + current ownership:
   ```sql
   SELECT c.id AS card_id, uc.level
   FROM cards c
   LEFT JOIN user_cards uc ON uc.card_id = c.id AND uc.user_id = %s
   WHERE c.collection_id = %s AND c.idol_id = %s AND c.card_type = 'member'
   ```
2. No card row → return `None` (idol isn't in the published catalog yet — the win is simply not collectible, never an error).
3. If not yet at `LEVEL_CAP`, upsert (skip the write when already capped):
   ```sql
   INSERT INTO user_cards (user_id, card_id, level, first_won_at)
   VALUES (%s, %s, 1, %s)
   ON CONFLICT (user_id, card_id)
   DO UPDATE SET level = LEAST(user_cards.level + 1, %s)
   ```
4. **Bonus check — all of the idol's pages, same transaction.** Because one card counts toward every page the idol appears on, a single win can complete several pages at once. For each `has_bonus = TRUE`, `is_published = TRUE` page the idol belongs to (`idol_career` join), compare "member cards displayed on this page" vs. "of those, owned by this user":
   ```sql
   SELECT cge.group_id,
          COUNT(c.id)  AS member_total,
          COUNT(uc.id) AS member_owned
   FROM collection_group_eligibility cge
   JOIN idol_career ic  ON ic.group_id = cge.group_id
   JOIN cards c         ON c.collection_id = cge.collection_id
                       AND c.idol_id = ic.idol_id AND c.card_type = 'member'
   LEFT JOIN user_cards uc ON uc.card_id = c.id AND uc.user_id = %s
   WHERE cge.collection_id = %s AND cge.is_published = TRUE AND cge.has_bonus = TRUE
     AND cge.group_id IN (SELECT group_id FROM idol_career WHERE idol_id = %s)
   GROUP BY cge.group_id
   HAVING COUNT(c.id) = COUNT(uc.id)
   ```
   For each complete page, grant its `group_photo` card (resolved by `(collection_id, group_id)`) with `ON CONFLICT (user_id, card_id) DO NOTHING` and the same `won_at`. The bonus check runs even on the capped no-op path — it costs one query and self-heals pages published after the user finished collecting their members.
5. Return `{"card_id", "idol_id", "level", "is_new", "bonus_unlocked": [group_id, ...]}` — surfaced to the client as the `card_granted` field of the guess response (Q3 resolved: included now, not a fast-follow) and used for the victory log. Returns `None` when nothing was granted (no card row, or already at cap with no bonus change — in which case the caller sends `"card_granted": null`).

**`get_overview(cursor, user_id, collection_id=1) -> dict`** — aggregate query over published `collection_group_eligibility` pages joined through `idol_career` → `cards` → `LEFT JOIN user_cards`, returning per-group member totals/owned counts + bonus state (essentially the §3.1-step-4 query without the `HAVING` and without the idol filter, plus the bonus-card ownership join). `user_id=None` (anonymous with no valid token) returns the catalog with zero ownership.

**`get_group_page(cursor, user_id, group_id, collection_id=1) -> dict | None`** — full roster for one published page, membership resolved through `idol_career` at read time per the revised design:
```sql
SELECT ic.idol_id, i.artist_name, ic.is_active, ic.start_year, ic.end_year,
       c.id AS card_id, c.image_path,
       uc.level, uc.first_won_at
FROM idol_career ic
JOIN collection_group_eligibility cge
     ON cge.group_id = ic.group_id AND cge.collection_id = %s
JOIN cards c  ON c.collection_id = cge.collection_id
             AND c.idol_id = ic.idol_id AND c.card_type = 'member'
JOIN idols i  ON i.id = ic.idol_id
LEFT JOIN user_cards uc ON uc.card_id = c.id AND uc.user_id = %s
WHERE ic.group_id = %s AND cge.is_published = TRUE
ORDER BY ic.is_active DESC, ic.start_year ASC NULLS LAST, i.artist_name ASC
```
plus the page's bonus-card row/ownership. Returns `None` for unpublished/unknown pages → route 404s. (`is_active`/`end_year` ship to the client so a departed member's slot can be styled differently later — read-time data, nothing stored on the card.)

**No new repository** — `CollectionService` runs its own SQL with the passed cursor, exactly like `AlbumService` (the newest established pattern; `IdolRepository` predates it).

### 3.2 Hook into the existing win flow

Single hook inside **`GameService.save_user_history`** (`services/game_service.py`), placed inside the existing `if is_correct:` / `if not already_won_today:` block — i.e., alongside the streak update, **before** the one `connect.commit()`:

```python
# top of the method:
card_granted = None

# inside: if is_correct: ... if not already_won_today:
if COLLECTION_ENABLED and gamemode_id in COLLECTION_GAMEMODE_IDS:  # (1, 2)
    card_granted = CollectionService(self.db).grant_card_for_win(
        cursor, user_id, int(answer_id), current_timestamp
    )

# after commit — return contract changes (Q3):
return is_correct, card_granted
```

**Return-contract change (Q3 resolved):** `save_user_history` now returns `(is_correct, card_granted)` instead of the bare boolean. All three call sites are updated:
- `routes/games/classic.py` and `routes/games/blurry.py` unpack the tuple and add `"card_granted": card_granted` (dict or `null`) to their guess responses, so the frontend can show the card as part of the win celebration.
- `services/album_service.py` (`AlbumService.process_guess`) unpacks and discards the second value (`is_correct, _ = …`) — Pixelated never grants (Q2), and its response payload stays unchanged.

`card_granted` is non-null only on the **first** winning guess of the day (the hook sits inside the `already_won_today` guard), which is exactly when the celebration fires.

Why this exact spot:
- **Zero duplication** — Classic, Blurry (and any future idol mode) all converge on `save_user_history`; no per-route code.
- **Atomic** — card grant commits/rolls back with the win itself (project rule: `save_user_history` owns the single commit).
- **Double-grant safe for free** — the existing `already_won_today` guard already prevents re-granting when a user re-submits a correct guess on the same day.
- **Anonymous-compatible for free** — by this point `user_id` is already a resolved `users.id`, whether it came from a JWT or the anonymous UUID lookup (`SELECT id FROM users WHERE token = %s` in the routes). Confirmed against CLAUDE.md's auth section: anonymous users have real `users` rows via `POST /api/user/init`.
- For gamemodes 1/2, `answer_id` **is** the idol id (verified in `classic.py` / `blurry.py`).
- No import cycle: `game_service` imports `collection_service`; `collection_service` imports nothing from `game_service` (`AlbumService → GameService → CollectionService` is a clean chain).

**Pixelated (gamemode 3) does not grant cards** — an album win has no single idol identity (group albums have no `idol_id` at all). Collection 1 is an idol-card album, so granting is restricted to `gamemode_id IN (1, 2)` via the `COLLECTION_GAMEMODE_IDS` constant. → Open question #2 (incl. the soloist-album sub-case).

### 3.3 Routes (new blueprint `routes/collection.py`)

Registered in `app.py` under `/api` **only when `COLLECTION_ENABLED`** (mirrors the `ADMIN_ENABLED` gating pattern). Thin routes per project convention: `get_db()` + cursor, `try/finally: cursor.close()`, delegate to `CollectionService`. Both routes use `@optional_auth` and resolve `user_id` with the same JWT/anonymous-header block used by the guess routes (no body-token legacy branch — these are GETs); unresolvable identity degrades to `user_id=None` (catalog visible, nothing owned) rather than erroring.

The global `gamemode_id` query param the frontend interceptor injects is simply ignored (harmless, same as for `/idols-list`).

**`GET /api/collection/overview`** →
```json
{
  "collection_id": 1,
  "name": "Album 1",
  "total_cards": 130,
  "owned_cards": 42,
  "groups": [
    {
      "group_id": 3,
      "group_name": "TWICE",
      "member_total": 9,
      "member_owned": 4,
      "has_bonus": true,
      "bonus_owned": false
    }
  ]
}
```
- `total_cards`/`owned_cards` are **distinct catalog cards** (member + bonus) — an idol shown on two pages still counts once here.
- `member_total`/`member_owned` are **per-page slot counts** — the same idol's card legitimately counts on each page that displays it, so the sum across groups may exceed `total_cards`. This is the sticker-album mental model (slots per page), worth stating so the numbers aren't mistaken for a bug.
- `groups` ordered by `group_name`; presentation can reorder client-side.

**`GET /api/collection/groups/<int:group_id>`** →
```json
{
  "group_id": 3,
  "group_name": "TWICE",
  "has_bonus": true,
  "member_total": 9,
  "member_owned": 4,
  "bonus": { "card_id": 77, "image_path": "cards/twice_group.webp", "owned": false },
  "members": [
    {
      "card_id": 12,
      "idol_id": 5,
      "artist_name": "Sana",
      "image_path": "cards/sana.webp",
      "is_active": true,
      "owned": true,
      "level": 2,
      "first_won_at": "2026-07-01T21:14:00Z"
    }
  ]
}
```
404 for unpublished/unknown group pages. Un-owned cards still ship name + image (no rarity/secrecy in Collection 1); the UI renders them as empty/grayed slots. `bonus` is `null` when `has_bonus = false` (Soloist page).

`collection_id` stays an optional query param defaulting to 1 at the service layer — Collection 2 later adds a param, not new routes.

**Guess-response addition (Q3 resolved) — existing routes, new field.** `POST /api/game/classic/guess` and `POST /api/game/blurry/guess` gain one additive field alongside the current `guess_correct`/`feedback`/`guessed_idol_data`:
```json
{
  "guess_correct": true,
  "feedback": { "…": "unchanged" },
  "guessed_idol_data": { "…": "unchanged" },
  "card_granted": {
    "card_id": 12,
    "idol_id": 5,
    "is_new": true,
    "level": 1,
    "bonus_unlocked": [3]
  }
}
```
`card_granted` is `null` whenever nothing was granted: wrong guess, repeat win same day, flag off, no card row for the idol, or already at `LEVEL_CAP` with no bonus change. Pixelated's guess response is untouched (gamemode 3 never grants, Q2).

---

## 4. Catalog Population Script (`populate_collection_cards.py`, backend root)

Standalone, **re-runnable/idempotent**, NOT a migration (sits next to `seed_db.py`, uses `get_manual_db()` like `seed_db.py` does). Steps:

1. Seed the collection row: `INSERT INTO collections (id, name) VALUES (1, 'Album 1') ON CONFLICT (id) DO NOTHING;` then bump the sequence (`setval`) so future inserts start above it (id=2 stays free for the seasonal collection).
2. Seed eligibility — one row per group that has at least one `idol_career` row:
   ```sql
   INSERT INTO collection_group_eligibility (collection_id, group_id, is_published, has_bonus)
   SELECT 1, g.id, FALSE, (g.id != 20)
   FROM groups g
   WHERE EXISTS (SELECT 1 FROM idol_career ic WHERE ic.group_id = g.id)
   ON CONFLICT (collection_id, group_id) DO NOTHING;
   ```
   Everything lands **unpublished**; the developer flips `is_published` per page when its card images are curated. `has_bonus` defaults to `TRUE` except the Soloist page (20). Re-runs never overwrite manual publish/bonus edits (`DO NOTHING`).
3. Build member cards — **one row per distinct idol** appearing on any published page (the revised design; no idol+group pairs):
   ```sql
   INSERT INTO cards (collection_id, idol_id, card_type)
   SELECT DISTINCT 1, ic.idol_id, 'member'
   FROM idol_career ic
   JOIN collection_group_eligibility cge
        ON cge.group_id = ic.group_id AND cge.collection_id = 1
   JOIN idols i ON i.id = ic.idol_id
   WHERE cge.is_published = TRUE
     AND i.is_published = TRUE
   ON CONFLICT (collection_id, idol_id) WHERE card_type = 'member' DO NOTHING;
   ```
   Two things flagged here:
   - *`i.is_published = TRUE` filter is an addition over the spec* — unpublished idols can never be picked as a daily answer, so their cards would be permanently unobtainable slots that block page bonuses. → Open question #4.
   - *Cards are only created for idols on **published** pages* (per the revised spec's query). Operational consequence: the publish flow is "flip `is_published` → re-run this script" so the newly published page's idols get cards. An idol already carded via another published page needs nothing — her single card simply starts appearing on the new page through the read-time join.
4. Build bonus cards for `has_bonus` published pages:
   ```sql
   INSERT INTO cards (collection_id, group_id, idol_id, card_type)
   SELECT 1, cge.group_id, NULL, 'group_photo'
   FROM collection_group_eligibility cge
   WHERE cge.collection_id = 1 AND cge.has_bonus = TRUE AND cge.is_published = TRUE
   ON CONFLICT (collection_id, group_id) WHERE card_type = 'group_photo' DO NOTHING;
   ```
5. Print a summary (pages/cards inserted vs. already present). `image_path` stays `NULL` at population time — the developer curates card art and fills it before publishing each page (see Assumption A1).

---

## 5. Backfill Script (`backfill_collection_cards.py`, backend root)

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
- For each row: `grant_card_for_win(cursor, user_id, idol_id, won_at or midnight-of-date)` — chronological order per user so `first_won_at` and evolution levels come out historically correct; bonus unlocks fire automatically through the same code path.
- **`--dry-run`**: runs the entire replay inside one transaction and issues `ROLLBACK` at the end, printing what would happen (users touched, new cards, level-ups, bonus unlocks, non-collectible wins skipped). This exercises the real code path instead of a parallel "counting" implementation. Real run: single `COMMIT` at the end (all-or-nothing).
- **Double-run guard**: aborts if `user_cards` is non-empty unless `--force` is passed, because level increments are not idempotent (replaying wins on top of existing ownership would double-level cards). Documented as: *run once, before launch, after the catalog script and after publishing the launch set of pages*. If more pages are published later, past wins of newly carded idols are not retro-granted by default — see Open question #6.
- Requires the launch pages published first (idols without card rows are skipped by design).

---

## 6. Frontend Architecture

No visual design here (per scope) — components and data flow only. Visual language comes later from `DESIGN.md` (sticker/washi/polaroid motifs are a natural fit) unless the user directs a divergence.

> **Deviation flagged:** the Collection is a **page, not a game mode**. It has no daily state, no guesses, no `gamemode_id`. So — unlike the "Adding a New Game Mode" recipe — we do **not** extend the `GameMode` union, the `MODES` map in `api.ts`, or `useClearGameStorage` (no per-day localStorage state exists; everything is server-side). It follows the `pages/Idols/` shape instead (list page + detail page).

### Files & structure

```
src/pages/Collection/
├── CollectionOverview.tsx      — /collection: album cover + all group pages with progress
├── CollectionGroupPage.tsx     — /collection/:groupId: roster grid + bonus slot + completion count
└── components/                 — page-scoped subcomponents:
    ├── GroupProgressCard.tsx   — one group tile on the overview (name, owned/total, bonus badge)
    ├── MemberCardSlot.tsx      — one roster slot: owned (image + level pips) vs empty state
    ├── BonusCardSlot.tsx       — the group-photo slot: locked / unlocked
    └── CollectionProgress.tsx  — overall completion header (owned/total)
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
export const getCollectionOverview = async (): Promise<CollectionOverview> => {
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

### Types (`interfaces/gameInterfaces.ts`)

`CollectionGroupSummary`, `CollectionOverview`, `CollectionMemberCard`, `CollectionBonusCard`, `CollectionGroupDetail` — mirroring the payloads in §3.3, one-to-one — plus `CardGranted` (`{ card_id, idol_id, is_new, level, bonus_unlocked: number[] } | null`), added to the Classic/Blurry guess-response types.

### Win celebration (Q3 resolved)

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

### Phase 1 — Backend schema
- [ ] 1. Create `kpopit-backend/migrations/025_add_collections.sql` with the §2 schema (DDL only, `BEGIN/COMMIT`, `IF NOT EXISTS`, named constraints, partial unique indexes).
- [ ] 2. Run `python migrations/migrations.py` against the dev DB; verify all four tables + partial unique indexes exist (`\d cards`).
- [ ] 3. Add the four new tables to `TRUNCATE_SQL` in `kpopit-backend/tests/conftest.py` and apply the migration to the `kpopit_test` DB.

### Phase 2 — Catalog population script
- [ ] 4. Create `kpopit-backend/populate_collection_cards.py` (§4): seed `collections` id=1, eligibility rows (`DO NOTHING`), one member card per distinct published idol on published pages, bonus cards for `has_bonus` published pages, summary output.
- [ ] 5. Run it twice against dev DB (with at least one page flipped to published in between); verify idempotency (second identical run inserts 0 rows), manual `is_published`/`has_bonus` edits survive, and a multi-group idol gets exactly **one** card row.

### Phase 3 — Domain service
- [ ] 6. Create `kpopit-backend/services/collection_service.py`: `COLLECTION_ENABLED` + `COLLECTION_GAMEMODE_IDS = (1, 2)` + `LEVEL_CAP = 3` constants, `grant_card_for_win`, `get_overview`, `get_group_page` (§3.1) — no commits inside.
- [ ] 7. Write `kpopit-backend/tests/test_collection.py` (conftest-style integration tests): grant inserts at level 1 / increments to cap and stops; idol with no card row → no-op; a multi-group idol's single card counts on **all** her pages; bonus unlocks exactly when a page completes; one win completing two pages unlocks **both** bonuses; Soloist page never grants a bonus; grant works for an anonymous-user row.
- [ ] 8. Hook `GameService.save_user_history` (§3.2) inside the `not already_won_today` block, guarded by flag + gamemode; change its return to `(is_correct, card_granted)` and update all three call sites (`classic.py` + `blurry.py` add `"card_granted"` to the guess response; `AlbumService.process_guess` discards it). Add tests: winning Classic/Blurry guess grants a card **and** the response carries `card_granted` (with `is_new`/`level`/`bonus_unlocked`); repeat correct guess same day → `card_granted: null` and no re-grant; Pixelated win grants nothing and its response shape is unchanged; flag off → `user_cards` untouched and `card_granted: null`.
- [ ] 9. Run the full backend suite (`pytest kpopit-backend/tests -v`) — existing `test_pixelated.py` must stay green.

### Phase 4 — Routes
- [ ] 10. Create `kpopit-backend/routes/collection.py`: `collection_bp`, the two GET endpoints (§3.3) with `@optional_auth`, thin-route + `try/finally` convention.
- [ ] 11. Register `collection_bp` in `app.py` under `/api`, gated by `COLLECTION_ENABLED`; add the env var to backend `.env` (dev value `true`).
- [ ] 12. Endpoint tests in `test_collection.py`: overview/detail shapes (incl. per-page slot counts vs distinct totals), anonymous UUID header vs JWT vs no auth (zero ownership), 404 on unpublished page, routes absent when flag off.

### Phase 5 — Backfill script
- [ ] 13. Create `kpopit-backend/backfill_collection_cards.py` (§5): chronological replay through `grant_card_for_win`, `--dry-run` (transaction + rollback + report), non-empty `user_cards` guard with `--force`, single final commit.
- [ ] 14. Test on a dev DB copy: dry-run counts match a hand-checked sample; real run then a second run aborts on the guard; document the launch runbook (migrate → populate → publish pages → re-populate → backfill → enable flags) at the top of the script.

### Phase 6 — Frontend
- [ ] 15. Add types to `src/interfaces/gameInterfaces.ts` (collection payloads + `CardGranted` on the guess-response types); add `getCollectionOverview` / `getCollectionGroupPage` to `src/services/api.ts` (anonymous-header pattern, §6).
- [ ] 16. Create `pages/Collection/CollectionOverview.tsx` + `components/` (GroupProgressCard, CollectionProgress) with `useQuery(["collectionOverview"])`.
- [ ] 17. Create `pages/Collection/CollectionGroupPage.tsx` + MemberCardSlot / BonusCardSlot with `useQuery(["collectionGroup", groupId])`; handle 404 → redirect to `/collection`.
- [ ] 18. Register both routes in `main.tsx` gated by `VITE_COLLECTION_ENABLED`; add the nav entry in `components/NavBar/navigation.ts` (flag-gated); add the env var to frontend `.env`.
- [ ] 19. Wire `card_granted` from the guess response into the Classic/Blurry win-celebration flow (`CardGrantedReveal` slot, flag-gated, §6) **and** invalidate collection queries on winning guesses.
- [ ] 20. `npm run build` + `npm run lint` clean; manual pass with flag on and off.

### Phase 7 — Flag wiring & docs
- [ ] 21. Verify the full off-state: both flags off → no routes, no nav, no grant writes, win flow identical to production today.
- [ ] 22. Update `CLAUDE.md`: env-var tables (`COLLECTION_ENABLED`, `VITE_COLLECTION_ENABLED`), schema highlights (four new tables, card-per-idol design), and a short "Collection system" architecture note; check off this plan's boxes as phases completed.

---

## 8. Files Created / Modified

**Created — backend**
| File | Purpose |
|---|---|
| `kpopit-backend/migrations/025_add_collections.sql` | Four collection tables + indexes/constraints |
| `kpopit-backend/populate_collection_cards.py` | Idempotent catalog build (collections, eligibility, cards) |
| `kpopit-backend/backfill_collection_cards.py` | One-time historical win replay (`--dry-run`/`--force`) |
| `kpopit-backend/services/collection_service.py` | Grant + read logic, flag/gamemode/cap constants |
| `kpopit-backend/routes/collection.py` | `GET /api/collection/overview`, `GET /api/collection/groups/<id>` |
| `kpopit-backend/tests/test_collection.py` | Service + route + hook integration tests |

**Created — frontend**
| File | Purpose |
|---|---|
| `src/pages/Collection/CollectionOverview.tsx` | Album overview page |
| `src/pages/Collection/CollectionGroupPage.tsx` | Group roster page |
| `src/pages/Collection/components/GroupProgressCard.tsx` | Overview group tile |
| `src/pages/Collection/components/MemberCardSlot.tsx` | Roster slot (owned/empty + level) |
| `src/pages/Collection/components/BonusCardSlot.tsx` | Group-photo slot (locked/unlocked) |
| `src/pages/Collection/components/CollectionProgress.tsx` | Completion header |

**Modified**
| File | Change |
|---|---|
| `kpopit-backend/services/game_service.py` | Flag-gated `grant_card_for_win` hook in `save_user_history`; return becomes `(is_correct, card_granted)` |
| `kpopit-backend/routes/games/classic.py` | Unpack new return; add `"card_granted"` to guess response |
| `kpopit-backend/routes/games/blurry.py` | Unpack new return; add `"card_granted"` to guess response |
| `kpopit-backend/services/album_service.py` | Unpack new return, discard `card_granted` (response unchanged) |
| `kpopit-backend/app.py` | Conditional `collection_bp` registration (`COLLECTION_ENABLED`) |
| `kpopit-backend/tests/conftest.py` | New tables in `TRUNCATE_SQL`; collection fixtures |
| `src/services/api.ts` | Two collection API functions |
| `src/interfaces/gameInterfaces.ts` | Collection payload types |
| `src/main.tsx` | Flag-gated `/collection` + `/collection/:groupId` routes |
| `src/components/NavBar/navigation.ts` | Flag-gated Collection nav entry |
| `src/pages/ClassicMode/…` + `src/pages/BlurryMode/…` (win handlers) | Read `card_granted` from guess response → celebration; invalidate collection queries on win |
| `src/pages/Collection/components/CardGrantedReveal.tsx` *(created)* | Card-granted slot in the win celebration (flag-gated) |
| `CLAUDE.md` | Env vars, schema highlights, architecture note |
| Backend/Frontend `.env` | `COLLECTION_ENABLED` / `VITE_COLLECTION_ENABLED` |

**Explicitly NOT touched:** `AlbumService`/`IdolService` (grant hook lives in the shared `save_user_history`), `useGameMode` / `MODES` map / `useClearGameStorage` (not a game mode), scoring/streak logic, `daily_picks`/`daily_user_history` schema.

---

## 9. Explicit Non-Goals

- **No Collection 2 (seasonal/gacha).** `collections.id = 2` is reserved conceptually — no row seeded, no rarity/variant/fragment/trading schema, no design. Its future card table (where group/era IS part of card identity) is separate and does not retrofit onto Album 1's `cards`.
- **No auth-gating for Album 1.** Anonymous UUID users collect identically to registered users; the only auth distinction left for Collection 2 is that everything is keyed by `collection_id` so a future mode can add `@require_auth` on its own routes.
- **No final visual design.** Component/data architecture only; visuals come later under `DESIGN.md` (or an intentional divergence if the user asks).
- **No "play previous days" feature.** Mentioned only as future context for why card evolution exists; nothing built.
- **No card image pipeline/admin UI.** Schema has `image_path`; sourcing/uploading is the developer's manual curation for now.

---

## 10. Open Questions — ALL RESOLVED (user, 2026-07-07) — & Assumptions

**Q1 — Level cap: 3. ✅ RESOLVED.** `LEVEL_CAP = 3` constant + DB CHECK `BETWEEN 1 AND 3`. Applies only to Album 1's `cards`/`user_cards` — the future seasonal Collection uses a completely different mechanic (rarity + fragments, no level/cap concept).

**Q2 — Pixelated (gamemode 3) does not grant cards. ✅ RESOLVED, no change.** A future "album of albums" collection may cover Pixelated wins, but that's a separate, unplanned system — not this one, and not the seasonal Collection either (seasonal will have its own "open a card" pack mechanic unrelated to daily wins).

**Q3 — `card_granted` in the guess response: ✅ RESOLVED, plan default REVERSED — included NOW, not a fast-follow.** Granting still happens inside `save_user_history` at guess-time (unchanged), but its return becomes `(is_correct, card_granted)` and the Classic/Blurry guess responses surface `"card_granted": { card_id, idol_id, is_new, level, bonus_unlocked } | null` so the frontend shows the card as part of the win celebration — in addition to (not instead of) invalidating the collection queries. See §3.2 (return contract), §3.3 (response shape), §6 (win celebration).

**Q4 — Catalog filters unpublished idols (`idols.is_published = TRUE`). ✅ RESOLVED: confirmed as flagged.** Unpublished idols can never be a daily answer, so their card slots would be unobtainable and would block page bonuses forever. Re-running the population script after publishing an idol adds their card.

**Q5 — `collection_group_eligibility` PK: ✅ RESOLVED — natural composite `(collection_id, group_id)`, no surrogate `id`.** Same rationale as the 024 `blurry_mode_data` cleanup: nothing references this table by FK and the pair is already unique. §2 migration updated; §3/§4 queries verified — all lookups already go through `(collection_id, group_id)`, and the population script's `ON CONFLICT (collection_id, group_id)` targets the PK directly.

**Q6 — Pages/idols published after the backfill. ✅ RESOLVED: accepted limitation for launch.** Wins that predate an idol's card creation are not retro-granted (backfill is one-time; the live grant skips idols without card rows). Publishing the full launch set of pages *before* the backfill makes it moot, and the bonus-check self-heal (§3.1 step 4) mitigates going forward: a later win of any of the page's members re-evaluates completion.

**Assumptions**
- **A1:** A group page is only flipped to `is_published = TRUE` once its card images are curated (`cards.image_path` filled for its idols) — so no separate `cards.is_published` state is needed and the UI never renders image-less cards. Because a card is shared across pages, curating is per-idol, not per-page.
- **A2:** Card images will live in the existing R2 bucket structure; `cards.image_path` stores a relative path like `idols.image_path` does. No upload tooling in this plan.
- **A3:** `first_won_at` uses the same timestamp source as `won_at` (`get_current_timestamp()` from `utils/dates.py`) on the live path and historical `won_at` in the backfill.
- **A4:** Bonus cards keep `level = 1` in `user_cards` (column unused for them; binary semantics enforced by `DO NOTHING` on re-grant) — no separate ownership table for bonus cards.
- **A5:** One win can unlock multiple page bonuses simultaneously (single-card design consequence, §3.1 step 4) — accepted and intended.
- **A6:** Overview/group endpoints are unauthenticated-readable (catalog is public data; ownership overlays only with a valid identity). No rate-limit decorators beyond Flask-Limiter's defaults, matching other game GET routes.

---

## Verification (for the implementation phase, after approval)

1. **Backend:** `pytest kpopit-backend/tests -v` — new `test_collection.py` plus the untouched `test_pixelated.py` suite green.
2. **Migration:** apply 025 to dev + `kpopit_test`; run `populate_collection_cards.py` twice (second run = 0 inserts); confirm a multi-group idol has exactly one card row.
3. **End-to-end (flag on):** publish one page in dev, win a Classic game as an anonymous user → one `user_cards` row at level 1 **and** the guess response carries `card_granted` (`is_new: true, level: 1`); win again next (offset) day via `TEST_MODE`/`TEST_DATE_OFFSET` → level 2; complete a small test page → bonus card appears and `bonus_unlocked` lists the group; verify the same idol's card shows as owned on *every* page she appears on; `/collection` UI reflects all of it without reload after a win.
4. **Backfill:** `--dry-run` report vs. hand-counted expected grants on a dev DB copy; real run; guard blocks a second run.
5. **Flag-off regression:** both flags off → guess flow, routes, and UI byte-identical to today (no `user_cards` writes, 404 on collection routes, no nav entry).
