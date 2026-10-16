"""
Simulate the daily draw (services/daily_draw.py) in memory for every mode.

Reads the current catalog and past picks from the DB in DB_URL through a READ ONLY
connection, then runs the real `draw()` day by day without writing anything. The
catalog stays as it is today (no new idols/albums during the simulation).

    .venv/Scripts/python.exe scripts/simulate_draw.py            # 730 days, seed 42
    .venv/Scripts/python.exe scripts/simulate_draw.py --days 365 --seed 7
"""

import argparse
import os
import random
import sys
from collections import Counter
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.daily_draw import _MODES, DrawItem, draw  # noqa: E402
from services.get_db import get_manual_db, pool  # noqa: E402
from utils.dates import get_today_date  # noqa: E402

MODE_NAMES = {1: "Classic", 2: "Blurry", 3: "Pixelated"}
RETURN_WINDOW = 30


def load_catalog(cursor, gamemode_id, start):
    mode = _MODES[gamemode_id]
    cursor.execute(f"WITH eligible AS ({mode['eligible']}) SELECT id, entry_date FROM eligible")
    entry = {r["id"]: r["entry_date"] or start for r in cursor.fetchall()}
    cursor.execute(
        f"""SELECT {mode['column']} AS item_id, MAX(pick_date) AS last_pick FROM daily_picks
            WHERE gamemode_id = %s AND pick_date < %s AND {mode['column']} IS NOT NULL GROUP BY 1""",
        (gamemode_id, start),
    )
    last_pick = {r["item_id"]: r["last_pick"] for r in cursor.fetchall() if r["item_id"] in entry}
    return entry, last_pick


def simulate(entry, last_pick, start, days, rng):
    last_pick = dict(last_pick)
    n = len(entry)
    times = Counter()
    returns = 0
    max_wait = 0
    for offset in range(days):
        day = start + timedelta(days=offset)
        items = []
        for item_id, entered in entry.items():
            since = last_pick.get(item_id, entered)
            items.append(DrawItem(item_id, max((day - since).days, 0), item_id not in last_pick))
        chosen = draw(items, n, rng)
        wait = next(i.wait for i in items if i.item_id == chosen)
        if chosen in last_pick and wait <= RETURN_WINDOW:
            returns += 1
        max_wait = max(max_wait, wait)
        last_pick[chosen] = day
        times[chosen] += 1

    end = start + timedelta(days=days)
    for item_id, entered in entry.items():
        max_wait = max(max_wait, (end - last_pick.get(item_id, entered)).days)
    never = sum(1 for item_id in entry if times[item_id] == 0)
    return times, never, max_wait, returns


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--days", type=int, default=730)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    start = get_today_date()
    rng = random.Random(args.seed)
    try:
        with get_manual_db() as conn:
            conn.read_only = True
            with conn.cursor() as cursor:
                catalogs = {gm: load_catalog(cursor, gm, start) for gm in _MODES}
            conn.rollback()
            conn.read_only = False
    finally:
        pool.close()

    print(f"Simulated {args.days} days from {start} (seed {args.seed}, static catalog)\n")
    for gm, (entry, last_pick) in catalogs.items():
        times, never, max_wait, returns = simulate(entry, last_pick, start, args.days, rng)
        dist = Counter(times[item_id] for item_id in entry)
        print(f"{MODE_NAMES[gm]}: N={len(entry)} eligible, {len(last_pick)} picked before {start}")
        print("  times picked -> items: " + ", ".join(f"{k}x: {dist[k]}" for k in sorted(dist)))
        print(f"  never picked in the simulation: {never}")
        print(f"  max wait (days): {max_wait}")
        print(f"  returns within {RETURN_WINDOW} days: {returns}\n")


if __name__ == "__main__":
    main()
