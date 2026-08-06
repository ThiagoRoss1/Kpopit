# Backfill Album 1 collection cards from historical wins (One time run).

# Launch runbook:
#   1. python migrations/migrations.py        (schema)
#   2. python seed_db.py                      (collections + eligibility CSVs)
#   3. Publish the launch set of pages (flip is_eligible in the CSV) + re-run seed_db.py
#   4. python seed_collection_cards.py        (derived card catalog)
#   5. python -m scripts.backfill_collection_cards --dry-run   (check the report)
#   6. python -m scripts.backfill_collection_cards            (real run)
#   7. Enable COLLECTION_ENABLED / VITE_COLLECTION_ENABLED

import argparse
from datetime import datetime, time
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from services.collections_service import CollectionService, COLLECTION_GAMEMODE_IDS
from services.get_db import get_manual_db, pool

load_dotenv()

EST = ZoneInfo("America/New_York")

SOURCE_SQL = """
    SELECT duh.user_id, duh.date, duh.won_at, dp.idol_id
    FROM daily_user_history AS duh
    JOIN daily_picks AS dp
        ON dp.pick_date = duh.date AND dp.gamemode_id = duh.gamemode_id
    WHERE duh.won = TRUE
        AND duh.gamemode_id = ANY(%s)
        AND dp.idol_id IS NOT NULL
    ORDER BY duh.user_id, duh.date ASC
"""

def run_backfill(dry_run: bool = False, force: bool = False):
    with get_manual_db() as connect:
        with connect.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) AS n FROM user_cards")
            existing = cursor.fetchone()["n"]
            if existing and not force:
                print(f"ABORT: user_cards already has {existing} rows - replaying would double-level cards.")
                print("Run with --force only if you know the table state (e.g. partial restore).")
                return

            cursor.execute(SOURCE_SQL, (list(COLLECTION_GAMEMODE_IDS),))
            wins = cursor.fetchall()

            service = CollectionService(connect)
            stats = {"wins": len(wins), "new_cards": 0, "level_ups": 0, "bonus_unlocks": 0, "skipped": 0}
            users = set()

            try:
                for row in wins:
                    # Older rows predate won_at; fall back to midnight EST of the game day.
                    won_at = row["won_at"] or datetime.combine(row["date"], time.min, tzinfo=EST)
                    result = service.grant_card_for_win(cursor, row["user_id"], row["idol_id"], won_at)

                    if result is None:
                        stats["skipped"] += 1
                        continue

                    users.add(row["user_id"])
                    if result["is_new"]:
                        stats["new_cards"] += 1
                    else:
                        stats["level_ups"] += 1
                    stats["bonus_unlocks"] += len(result["group_photo"])

                print(f"Wins replayed: {stats['wins']} | users touched: {len(users)}")
                print(f"New cards: {stats['new_cards']} | level-ups: {stats['level_ups']} | bonus unlocks: {stats['bonus_unlocks']}")
                print(f"Non-collectible wins skipped (no card row): {stats['skipped']}")

                if dry_run:
                    connect.rollback()
                    print("DRY RUN - all changes rolled back.")
                else:
                    connect.commit()
                    print("Backfill committed.")

            except Exception as e:
                connect.rollback()
                print(f"Error during backfill (rolled back): {e}")
                raise

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Replay historical wins into Album 1 collection cards.")
    parser.add_argument("--dry-run", action="store_true", help="Replay inside a transaction and roll back, printing the report.")
    parser.add_argument("--force", action="store_true", help="Skip the non-empty user_cards guard.")
    args = parser.parse_args()

    try:
        run_backfill(dry_run=args.dry_run, force=args.force)
    finally:
        pool.close()
