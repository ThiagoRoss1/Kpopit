# Fill daily_user_history.guessed_ids for games played before migration 027, from their old
# game_state, marked guesses_origin = 'backfill' (profile/calendar only, never ranking).
# Idempotent: only rows still NULL and before today's game day are read; unreadable rows are
# skipped and counted, never guessed.
#   python -m scripts.backfill_guessed_ids --dry-run   (counts only, rolls back)
#   python -m scripts.backfill_guessed_ids

import argparse
import json
from collections import Counter

from dotenv import load_dotenv
from services.get_db import get_manual_db, pool
from utils.dates import get_today_date

load_dotenv()

DETAILS_KEY = {1: "today_guesses_details", 2: "blurry_guesses_details", 3: "pixelated_guesses_details"}

SOURCE_SQL = """
    SELECT duh.id, duh.date, duh.gamemode_id, duh.won, duh.game_state,
           COALESCE(dp.idol_id, dp.album_id) AS answer_id
    FROM daily_user_history AS duh
    LEFT JOIN daily_picks AS dp ON dp.pick_date = duh.date AND dp.gamemode_id = duh.gamemode_id
    WHERE duh.guessed_ids IS NULL AND duh.date < %s
    ORDER BY duh.id
"""


def _guess_id(entry, gamemode_id):
    """The id a stored guess names, or None if it is missing or ambiguous."""
    if not isinstance(entry, dict):
        return None
    if gamemode_id == 3:
        candidates = {entry.get("album_id")}
    else:
        data = entry.get("guessed_idol_data")
        if not isinstance(data, dict):
            return None
        candidates = {data.get("idol_id"), data.get("id")} - {None}
    if len(candidates) != 1:
        return None
    value = candidates.pop()
    return value if isinstance(value, int) and not isinstance(value, bool) and value > 0 else None


def parse_row(row, known_ids) -> tuple[list[int] | None, str]:
    """(guessed_ids, "ok") for a readable row, else (None, reason)."""
    if not row["game_state"]:
        return None, "no_game_state"
    try:
        state = json.loads(row["game_state"])
    except (TypeError, ValueError):
        return None, "invalid_json"
    if not isinstance(state, dict):
        return None, "invalid_json"
    if state.get("game_date") not in (None, row["date"].isoformat()):
        return None, "date_mismatch"

    details = state.get(DETAILS_KEY.get(row["gamemode_id"]))
    if not isinstance(details, list) or not details:
        return None, "no_guesses"
    ids = [_guess_id(entry, row["gamemode_id"]) for entry in details]
    if None in ids:
        return None, "unreadable_guess"
    ordered = list(dict.fromkeys(ids))  # a repeated id counts once, like live play
    if any(guess not in known_ids[row["gamemode_id"]] for guess in ordered):
        return None, "unknown_id"

    answer = row["answer_id"]
    if answer is not None:
        if row["won"] and answer not in ordered:
            return None, "win_without_answer"
        if not row["won"] and answer in ordered:
            return None, "answer_without_win"
        if row["won"]:
            ordered = ordered[: ordered.index(answer) + 1]  # nothing counts after the win
    return ordered, "ok"


def run_backfill(dry_run: bool = False) -> Counter:
    counts = Counter()
    with get_manual_db() as connect:
        with connect.cursor() as cursor:
            cursor.execute("SELECT id FROM idols")
            idol_ids = {r["id"] for r in cursor.fetchall()}
            cursor.execute("SELECT id FROM albums")
            known_ids = {1: idol_ids, 2: idol_ids, 3: {r["id"] for r in cursor.fetchall()}}

            cursor.execute(SOURCE_SQL, (get_today_date(),))
            rows = cursor.fetchall()
            try:
                for row in rows:
                    ids, reason = parse_row(row, known_ids)
                    counts["scanned"] += 1
                    if ids is None:
                        counts[f"skipped_{reason}"] += 1
                        continue
                    cursor.execute(
                        """
                            UPDATE daily_user_history SET guessed_ids = %s, guesses_origin = 'backfill'
                            WHERE id = %s AND guessed_ids IS NULL
                        """, (ids, row["id"]),
                    )
                    counts["filled"] += cursor.rowcount
                    counts[f"filled_gamemode_{row['gamemode_id']}"] += cursor.rowcount

                for key in sorted(counts):
                    print(f"{key}: {counts[key]}")
                if dry_run:
                    connect.rollback()
                    print("DRY RUN - all changes rolled back.")
                else:
                    connect.commit()
                    print("Backfill committed.")
            except Exception:
                connect.rollback()
                raise
    return counts


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill guessed_ids from old game_state.")
    parser.add_argument("--dry-run", action="store_true", help="Print the counts and roll back.")
    args = parser.parse_args()
    try:
        run_backfill(dry_run=args.dry_run)
    finally:
        pool.close()
