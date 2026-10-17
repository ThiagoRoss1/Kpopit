"""Simulate services/daily_draw.py in memory for every mode, from the catalog and pick history in
DB_URL (read-only; nothing is written, the catalog stays static). From kpopit-backend:
    python -m scripts.simulate_draw [--days 730] [--seed 42]"""

import argparse
import random
from collections import Counter
from datetime import timedelta

from services.daily_draw import _MODES, DrawItem, draw
from services.get_db import get_manual_db, pool
from utils.dates import get_today_date

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
    """Run the draw day by day. Per simulated year (days 1-365, 366-730, ...) collects the
    longest wait at pick time, the longest wait still open at the year's end, returns within
    RETURN_WINDOW days and picks made after more than 365 days."""
    last_pick = dict(last_pick)
    n = len(entry)
    times = Counter()
    years = []
    for offset in range(days):
        if offset % 365 == 0:
            years.append({"max_pick_wait": 0, "max_open_wait": 0, "returns": 0, "over_365": 0})
        year = years[-1]
        day = start + timedelta(days=offset)
        items = []
        for item_id, entered in entry.items():
            since = last_pick.get(item_id, entered)
            items.append(DrawItem(item_id, max((day - since).days, 0), item_id not in last_pick))
        chosen = draw(items, n, rng)
        wait = next(i.wait for i in items if i.item_id == chosen)
        if chosen in last_pick and wait <= RETURN_WINDOW:
            year["returns"] += 1
        if wait > 365:
            year["over_365"] += 1
        year["max_pick_wait"] = max(year["max_pick_wait"], wait)
        last_pick[chosen] = day
        times[chosen] += 1
        if offset % 365 == 364 or offset == days - 1:
            end = day + timedelta(days=1)
            year["max_open_wait"] = max((end - last_pick.get(i, e)).days for i, e in entry.items())

    never = sum(1 for item_id in entry if times[item_id] == 0)
    return times, never, years


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
                cursor.execute("SELECT current_database() AS db")
                database = cursor.fetchone()["db"]
                catalogs = {gm: load_catalog(cursor, gm, start) for gm in _MODES}
            conn.rollback()
            conn.read_only = False
    finally:
        pool.close()

    print(f"Simulated {args.days} days from {start} on {database} (seed {args.seed}, static catalog, read-only)\n")
    for gm, (entry, last_pick) in catalogs.items():
        times, never, years = simulate(entry, last_pick, start, args.days, rng)
        dist = Counter(times[item_id] for item_id in entry)
        print(f"{MODE_NAMES[gm]}: N={len(entry)} eligible, {len(last_pick)} picked before {start}")
        print("  times picked -> items: " + ", ".join(f"{k}x: {dist[k]}" for k in sorted(dist)))
        print(f"  never picked in the simulation: {never}")
        for number, year in enumerate(years, start=1):
            print(f"  year {number}: max wait at pick {year['max_pick_wait']} d, longest open wait at year end "
                  f"{year['max_open_wait']} d, picks after >365 d: {year['over_365']}, "
                  f"returns within {RETURN_WINDOW} d: {year['returns']}")
        print()


if __name__ == "__main__":
    main()
