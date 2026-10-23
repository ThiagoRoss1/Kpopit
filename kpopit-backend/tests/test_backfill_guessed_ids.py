"""T41: scripts/backfill_guessed_ids.py fills guessed_ids from old game_state ('backfill'),
idempotently, skips what it can't read, and backfill rows never rank."""

import json
from datetime import timedelta

import pytest

from scripts.backfill_guessed_ids import run_backfill
from utils.dates import get_today_date


def classic_state(ids, game_date=None):
    state = {"today_guesses_details": [{"guessed_idol_data": {"idol_id": i, "id": i}} for i in ids]}
    if game_date:
        state["game_date"] = game_date
    return json.dumps(state)


@pytest.fixture
def old_row(db_conn, make_user):
    def _make(game_state, *, won=False, days_ago=1, gamemode_id=1, answer=None, user_id=None):
        user_id = user_id or make_user()[0]
        day = get_today_date() - timedelta(days=days_ago)
        with db_conn.cursor() as cur:
            if answer:
                column = "album_id" if gamemode_id == 3 else "idol_id"
                cur.execute(
                    f"INSERT INTO daily_picks (pick_date, {column}, gamemode_id) VALUES (%s, %s, %s) "
                    "ON CONFLICT (pick_date, gamemode_id) DO NOTHING",
                    (day, answer, gamemode_id),
                )
            # Rows written before migration 027 have NULL guessed_ids / guesses_origin.
            cur.execute(
                """
                INSERT INTO daily_user_history (user_id, date, gamemode_id, guesses_count, won, game_state,
                                                guessed_ids, guesses_origin)
                VALUES (%s, %s, %s, 3, %s, %s, NULL, NULL) RETURNING id
                """,
                (user_id, day, gamemode_id, won, game_state),
            )
            row_id = cur.fetchone()["id"]
        db_conn.commit()
        return row_id

    return _make


def stored(db_conn, row_id):
    with db_conn.cursor() as cur:
        cur.execute("SELECT guessed_ids, guesses_origin FROM daily_user_history WHERE id = %s", (row_id,))
        return cur.fetchone()


def test_dry_run_counts_without_writing(db_conn, make_idol, old_row):
    a, b = make_idol("A"), make_idol("B")
    row = old_row(classic_state([a, b]))
    counts = run_backfill(dry_run=True)
    assert (counts["scanned"], counts["filled"]) == (1, 1)
    assert stored(db_conn, row) == {"guessed_ids": None, "guesses_origin": None}


def test_fills_in_order_and_rerun_changes_nothing(db_conn, make_idol, old_row):
    a, b, answer = make_idol("A"), make_idol("B"), make_idol("Answer")
    day = (get_today_date() - timedelta(days=1)).isoformat()
    row = old_row(classic_state([b, a, b, answer], game_date=day), won=True, answer=answer)
    assert run_backfill()["filled"] == 1
    assert stored(db_conn, row) == {"guessed_ids": [b, a, answer], "guesses_origin": "backfill"}
    again = run_backfill()
    assert (again["scanned"], again["filled"]) == (0, 0)
    assert stored(db_conn, row)["guessed_ids"] == [b, a, answer]


def test_unreadable_rows_are_skipped_and_counted(db_conn, make_idol, old_row):
    a, answer = make_idol("A"), make_idol("Answer")
    rows = [
        old_row(None),
        old_row("{not json"),
        old_row(json.dumps({"today_guesses_details": []})),
        old_row(json.dumps({"today_guesses_details": [{"guessed_idol_data": {"idol_id": a, "id": a + 1}}]})),
        old_row(classic_state([a], game_date="2000-01-01")),
        old_row(classic_state([999999])),
        old_row(classic_state([a]), won=True, answer=answer, days_ago=2),
    ]
    counts = run_backfill()
    assert counts["filled"] == 0
    assert counts["scanned"] == len(rows)
    for reason in ("no_game_state", "invalid_json", "no_guesses", "unreadable_guess", "date_mismatch",
                   "unknown_id", "win_without_answer"):
        assert counts[f"skipped_{reason}"] == 1, reason
    assert all(stored(db_conn, r)["guessed_ids"] is None for r in rows)


def test_todays_rows_are_left_to_live_play(db_conn, make_idol, old_row):
    a = make_idol("A")
    row = old_row(classic_state([a]), days_ago=0)
    assert run_backfill()["scanned"] == 0
    assert stored(db_conn, row)["guessed_ids"] is None


def test_blurry_and_pixelated_rows(db_conn, make_idol, make_group, make_album, old_row):
    idol = make_idol("Blur")
    album = make_album("Cover", make_group("G"))
    blurry = old_row(json.dumps({"blurry_guesses_details": [{"guessed_idol_data": {"id": idol}}]}), gamemode_id=2)
    pixelated = old_row(json.dumps({"pixelated_guesses_details": [{"album_id": album}]}), gamemode_id=3)
    assert run_backfill()["filled"] == 2
    assert stored(db_conn, blurry)["guessed_ids"] == [idol]
    assert stored(db_conn, pixelated)["guessed_ids"] == [album]


def test_backfill_rows_never_rank(client, db_conn, make_user):
    user_id, token = make_user()
    with db_conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO daily_user_history (user_id, date, gamemode_id, guesses_count, won, won_at, started_at,
                                            guessed_ids, guesses_origin)
            VALUES (%s, %s, 1, 1, TRUE, NOW(), NOW(), '{1}', 'backfill')
            """,
            (user_id, get_today_date()),
        )
    db_conn.commit()
    assert client.get("/api/daily-users-count?gamemode_id=1").get_json() == {"user_count": 0}
    assert client.get("/api/daily-rank?gamemode_id=1", headers={"X-User-Token": token}).get_json()["rank"] is None
