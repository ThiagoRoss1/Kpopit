"""
Daily draw shared by every gamemode (plan §3).

Stateless: each item's wait comes only from `daily_picks` in its own mode, or from the
date it entered the game when that mode never picked it. Modes never affect each other.

    N        = eligible items in the mode
    wait     = days since the item's last pick in this mode (never picked: since entry)
    cooldown = picked in the last COOLDOWN_DAYS days -> not a candidate
    overdue  = never picked and wait >= max(300, N), or picked and wait >= max(365, N + 30);
               if any candidate is overdue, the draw is only among overdue items, weighted by wait
    weight   = (min(wait, N) / N) ** WAIT_EXPONENT; never picked = NEVER_PICKED_WEIGHT
    pressure = "late" items (never picked and in the game 60+ days, or wait >= N)
               are multiplied by 1 + late_count / (PRESSURE_SHARE * N)

Picks are made one day ahead: a request that needs today's pick also makes sure tomorrow's
exists. Tomorrow's pick is a secret: it is never returned or logged.
"""

import logging
import random
from dataclasses import dataclass
from datetime import date, timedelta

from utils.dates import get_today_date

logger = logging.getLogger(__name__)

COOLDOWN_DAYS = 10
WAIT_EXPONENT = 1
NEVER_PICKED_WEIGHT = 3
PRESSURE_SHARE = 0.10
NEVER_PICKED_DEADLINE_DAYS = 300
PICKED_DEADLINE_DAYS = 365
PICKED_DEADLINE_MARGIN = 30
LATE_NEVER_PICKED_DAYS = 60


@dataclass(frozen=True)
class DrawItem:
    item_id: int
    wait: int
    never_picked: bool


# Per mode: the daily_picks column, plus eligible items with their entry date.
# Eligibility matches what each mode used before this draw.
_MODES = {
    1: {
        "column": "idol_id",
        "eligible": "SELECT i.id, i.release_date AS entry_date FROM idols i WHERE i.is_published = TRUE",
    },
    2: {
        "column": "idol_id",
        "eligible": """
            SELECT i.id, i.release_date AS entry_date FROM idols i
            WHERE i.is_published = TRUE
              AND EXISTS (SELECT 1 FROM blurry_mode_data b WHERE b.idol_id = i.id AND b.is_active = TRUE)
        """,
    },
    3: {
        "column": "album_id",
        "eligible": "SELECT a.id, a.created_at::date AS entry_date FROM albums a WHERE a.is_published = TRUE",
    },
}


def _never_picked_deadline(n: int) -> int:
    return max(NEVER_PICKED_DEADLINE_DAYS, n)


def _picked_deadline(n: int) -> int:
    return max(PICKED_DEADLINE_DAYS, n + PICKED_DEADLINE_MARGIN)


def is_overdue(item: DrawItem, n: int) -> bool:
    deadline = _never_picked_deadline(n) if item.never_picked else _picked_deadline(n)
    return item.wait >= deadline


def is_late(item: DrawItem, n: int) -> bool:
    return (item.never_picked and item.wait >= LATE_NEVER_PICKED_DAYS) or item.wait >= n


def compute_weights(candidates: list[DrawItem], n: int) -> tuple[list[DrawItem], list[float]]:
    """Return the items that take part in the draw and their weights.

    `candidates` must already exclude items in cooldown; `n` is the full eligible count."""
    if not candidates:
        return [], []
    n = max(n, 1)

    overdue = [item for item in candidates if is_overdue(item, n)]
    if overdue:
        return overdue, [float(item.wait) for item in overdue]

    late_count = sum(1 for item in candidates if is_late(item, n))
    pressure = 1 + late_count / (PRESSURE_SHARE * n)

    weights = []
    for item in candidates:
        if item.never_picked:
            weight = float(NEVER_PICKED_WEIGHT)
        else:
            weight = (min(item.wait, n) / n) ** WAIT_EXPONENT
        if is_late(item, n):
            weight *= pressure
        weights.append(weight)
    return list(candidates), weights


def draw(items: list[DrawItem], n: int, rng: random.Random | None = None) -> int | None:
    """Pick one item id from all eligible items (cooldown applied here)."""
    if not items:
        return None
    rng = rng or random
    candidates = [item for item in items if item.never_picked or item.wait > COOLDOWN_DAYS]
    if not candidates:
        # Catalog smaller than the cooldown window: anything but the most recent pick.
        longest = max(item.wait for item in items)
        candidates = [item for item in items if item.wait == longest]
        return rng.choice(candidates).item_id

    pool, weights = compute_weights(candidates, n)
    return rng.choices([item.item_id for item in pool], weights=weights, k=1)[0]


def load_items(cursor, gamemode_id: int, pick_date: date) -> list[DrawItem]:
    """Eligible items for `gamemode_id` with their wait as of `pick_date` (picks before it only)."""
    mode = _MODES[gamemode_id]
    column = mode["column"]
    cursor.execute(
        f"""
            WITH eligible AS ({mode["eligible"]})
            SELECT e.id, e.entry_date,
                   (SELECT MAX(dp.pick_date) FROM daily_picks dp
                     WHERE dp.{column} = e.id AND dp.gamemode_id = %s AND dp.pick_date < %s) AS last_pick
            FROM eligible e
        """,
        (gamemode_id, pick_date),
    )
    items = []
    for row in cursor.fetchall():
        last_pick = row["last_pick"]
        since = last_pick or row["entry_date"] or pick_date
        items.append(DrawItem(
            item_id=row["id"],
            wait=max((pick_date - since).days, 0),
            never_picked=last_pick is None,
        ))
    return items


def _read_pick(cursor, gamemode_id: int, pick_date: date) -> int | None:
    column = _MODES[gamemode_id]["column"]
    cursor.execute(
        f"SELECT {column} AS item_id FROM daily_picks WHERE pick_date = %s AND gamemode_id = %s",
        (pick_date, gamemode_id),
    )
    row = cursor.fetchone()
    return row["item_id"] if row else None


def ensure_pick(cursor, gamemode_id: int, pick_date: date, rng: random.Random | None = None) -> int | None:
    """Return the pick for `pick_date`, drawing it first if missing.

    Concurrent callers race on UNIQUE (pick_date, gamemode_id): the loser's insert does
    nothing and it re-reads the winner's row, so every caller gets the same pick."""
    existing = _read_pick(cursor, gamemode_id, pick_date)
    if existing is not None:
        return existing

    items = load_items(cursor, gamemode_id, pick_date)
    chosen = draw(items, len(items), rng)
    if chosen is None:
        return None

    column = _MODES[gamemode_id]["column"]
    cursor.execute(
        f"""
            INSERT INTO daily_picks (pick_date, {column}, gamemode_id) VALUES (%s, %s, %s)
            ON CONFLICT (pick_date, gamemode_id) DO NOTHING
        """,
        (pick_date, chosen, gamemode_id),
    )
    return _read_pick(cursor, gamemode_id, pick_date)


def ensure_daily_picks(cursor, gamemode_id: int, rng: random.Random | None = None) -> int | None:
    """Return today's pick for the mode, making sure tomorrow's is drawn too.

    The caller commits. A failure drawing tomorrow never breaks today's game."""
    today = get_today_date()
    today_id = ensure_pick(cursor, gamemode_id, today, rng)

    if today_id is not None and _MODES[gamemode_id]["column"] == "idol_id":
        # General info shared by every mode; the draw never reads it.
        cursor.execute(
            "UPDATE idols SET last_picked_date = %s WHERE id = %s AND (last_picked_date IS NULL OR last_picked_date < %s)",
            (today, today_id, today),
        )

    cursor.execute("SAVEPOINT draw_tomorrow")
    try:
        ensure_pick(cursor, gamemode_id, today + timedelta(days=1), rng)
        cursor.execute("RELEASE SAVEPOINT draw_tomorrow")
    except Exception as error:
        cursor.execute("ROLLBACK TO SAVEPOINT draw_tomorrow")
        # Database diagnostics can contain tomorrow's failed row/answer ID.
        logger.error("Could not draw tomorrow's pick for gamemode %s (%s)", gamemode_id, type(error).__name__)

    return today_id
