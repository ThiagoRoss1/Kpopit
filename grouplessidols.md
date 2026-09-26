# Groupless Idols — "most recent past group" fallback

**Status:** IMPLEMENTED 2026-09-26 (fallback + `is_former_group` + "ex-" rendering, tests in
`kpopit-backend/tests/test_groupless_idols.py`). The data-check section below is still pending —
the validator script hasn't landed.
**Written:** 2026-09-20, after seeding idols 171–173.

## The situation

An idol can legitimately have **zero `idol_career` rows with `is_active = TRUE`** — she left
her group and hasn't joined a new one. First real cases: **171 Haeun, 172 Semi, 173 zzone**
(left cignature, then left LATENCY in 2026). HyunJin (90) also left LATENCY but still has
Loossemble active, so she isn't affected.

These rows are **correct as-is**. Don't flip `is_active` to 1 to paper over it — `is_active`
means "currently a member", and the profile page's Current/Past split, `active_group` in
Classic, and the `member_count` / `fandom_name` / group-company lookups all read it literally.
A fake active row would show LATENCY as her current group and attribute LATENCY's member
count, fandom and company to someone who left.

## What already works (verified 2026-09-20)

The DB design handles this. Nothing crashes, no scoring/streak impact:

- `classic.py:212` — group comparison uses **all** career rows, not just active ones, so she
  still gives a correct partial match against cignature / LATENCY members.
- `classic.py:277` — `active_groups[0] if active_groups else None`, written for this case.
- `classic.py:177` — `if group_id: ... else: group_companies = []`, also written for this case.
- `game_feedback_logic.py:34` — `numerical_feedback_function` guards `None`.
- `collections_service.py:91` and `:202` — join `idol_career` with **no** `is_active` filter,
  so her cards still appear on every group page she was ever in.
- `seed_collection_cards.py:13` — no `is_active` filter either, so she still gets a card.
- Idols list / profile — was the one place that assumed non-null `group_name`. Fixed
  2026-09-20 (null-safe + `buildIdolSlug` in `utils/formatters.ts`).

## The one cosmetic wart

If one of these three is the **daily Classic idol**:

- `AnswerHintsBox.tsx:18` — `memberCount ?? "Soloist"` → Hint 1 shows **"Soloist"**.
- `AnswerHintsBox.tsx:19` — `groups.length > 0 ? groups : ["Soloist"]` → Hint 2 shows **"Soloist"**.

Both fallbacks were written for real soloists. For a groupless ex-member they're wrong info.
Also `member_count` is NULL, so that column returns "incorrect" for every guess.

Scope: 3 idols out of 173, only on the day one of them is the answer, only in 2 hint cards
plus 1 comparison column. Not urgent.

## The idea

> **As built (2026-09-26):** the "ex-" label was dropped — the group shows plain, like any member. `FORMER_GROUP_PREFIX` in `utils/formatters.ts` is empty; set it to re-enable a marker.

Keep `is_active` truthful. Make the **"current group" read** fall back to the most recent
past group, and tell the client it's a former group.

1. **`routes/idols_page/idols_page.py:31`** and **`repositories/idol_repository.py:29`** —
   both do `LEFT JOIN idol_career AS ic ON i.id = ic.idol_id AND ic.is_active = TRUE`.
   Drop the `is_active` predicate from the join and pick the row by ordering instead:
   prefer active, then latest `end_year`, then latest `start_year`.
   - `idols_page.py` already uses `DISTINCT ON (i.id)`, so this is an `ORDER BY` change.
     Keep the existing `g.id ASC` tiebreak **for active rows only**, or multi-group active
     idols will silently change which group they show.
   - `fetch_full_idol_data` returns one row, so it needs the same ordering + `LIMIT 1`.
2. Add **`is_former_group` (bool)** to both payloads.
3. Frontend: when `is_former_group`, render **"ex-LATENCY"** — on the idols-list card
   (`IdolsCards`), the profile pill (`IdolProfile.tsx`), and the two hint cards. The profile's
   Current/Past section needs no change; it reads `fetch_full_idol_career` separately and is
   already correct.

Side effect (good): Classic gets a real `member_count` and `fandom_name` again instead of
nulls, so the hints stop saying "Soloist".

## Also worth adding: a data check

Add to the idol validator script (still not landed, from the 2026-09 idol expansion):

- **WARNING** — published idol with 0 active career rows. Legal state, but flag it so a
  fill-down typo doesn't slip through unnoticed.
- **ERROR** — idol with **0 career rows at all**. That one is genuinely invalid: every idol
  needs at least one row, even soloists (group id 20). All 173 currently pass.

## Do NOT do this

Don't gate the Classic daily pick on "has an active group". LATENCY (group 40) is
`is_eligible = true, has_bonus_cover = true` in `collection_group_eligibility.csv`, so its
group-photo card needs **all five** member cards. Excluding 171/172/173 from the pool would
make 3 of 5 cards unobtainable and lock the bonus cover permanently.
