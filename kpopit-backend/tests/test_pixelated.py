"""Integration tests for the Pixelated gamemode (gamemode_id = 3).

These Act as regression tests (aggregate stats + score on a win).
"""

import math
import uuid

import pytest

GM = 3

# ---------------------------------------------------------------------------
# GET /api/game/pixelated/daily-album
# ---------------------------------------------------------------------------

def test_daily_album_returns_cover_and_omits_name(client, db_conn, make_group, make_album):
    gid = make_group("AAA")
    make_album("Hidden Title", gid, "/covers/hidden.jpg")

    resp = client.get(f"/api/game/pixelated/daily-album?gamemode_id={GM}")
    assert resp.status_code == 200
    body = resp.get_json()

    assert "cover_path" in body
    assert body["cover_path"] == "/covers/hidden.jpg"
    assert "name" not in body
    assert "group_name" in body


def test_daily_album_404_when_no_published_albums(client):
    resp = client.get(f"/api/game/pixelated/daily-album?gamemode_id={GM}")
    assert resp.status_code == 404
    assert resp.get_json().get("error")


# ---------------------------------------------------------------------------
# POST /api/game/pixelated/guess
# ---------------------------------------------------------------------------

def test_guess_correct_returns_guessed_album_data(client, db_conn, make_user, make_group, make_album, set_daily_pick, today):
    _, token = make_user()
    gid = make_group("Pixie")
    aid = make_album("Cosmic Dream", gid)
    set_daily_pick(aid, GM)

    resp = client.post(
        f"/api/game/pixelated/guess?gamemode_id={GM}",
        json={"album_id": aid, "current_attempt": 1, "game_date": today},
        headers={"Authorization": token},
    )
    assert resp.status_code == 200
    body = resp.get_json()

    assert body["guess_correct"] is True
    assert body["guessed_album_data"]["album_id"] == aid
    assert body["guessed_album_data"]["album_name"] == "Cosmic Dream"
    assert body["guessed_album_data"]["group_name"] == "Pixie"
    assert "cover_path" in body["guessed_album_data"]
    # Answer fields must never leak at the top level
    assert "album_name" not in body
    assert "group_name" not in body


def test_guess_wrong_returns_guessed_album_data_not_answer(client, db_conn, make_user, make_group, make_album, set_daily_pick, today):
    _, token = make_user()
    gid = make_group("Pixie")
    correct_aid = make_album("Cosmic Dream", gid)
    wrong_aid = make_album("Other Album", gid)
    set_daily_pick(correct_aid, GM)

    resp = client.post(
        f"/api/game/pixelated/guess?gamemode_id={GM}",
        json={"album_id": wrong_aid, "current_attempt": 1, "game_date": today},
        headers={"Authorization": token},
    )
    assert resp.status_code == 200
    body = resp.get_json()

    assert body["guess_correct"] is False
    assert body["guessed_album_data"]["album_id"] == wrong_aid
    assert body["guessed_album_data"]["album_name"] == "Other Album"
    assert body["guessed_album_data"]["group_name"] == "Pixie"
    import json
    raw = json.dumps(body)
    assert "Cosmic Dream" not in raw


def test_guess_missing_token_returns_400(client, make_group, make_album, set_daily_pick, today):
    gid = make_group("Pixie")
    aid = make_album("Cosmic Dream", gid)
    set_daily_pick(aid, GM)

    resp = client.post(
        f"/api/game/pixelated/guess?gamemode_id={GM}",
        json={"album_id": aid, "current_attempt": 1, "game_date": today},
    )
    assert resp.status_code == 400


def test_guess_game_date_mismatch_returns_400(client, make_user, make_group, make_album, set_daily_pick):
    _, token = make_user()
    gid = make_group("Pixie")
    aid = make_album("Cosmic Dream", gid)
    set_daily_pick(aid, GM)

    resp = client.post(
        f"/api/game/pixelated/guess?gamemode_id={GM}",
        json={"album_id": aid, "current_attempt": 1, "game_date": "1999-01-01"},
        headers={"Authorization": token},
    )
    assert resp.status_code == 400
    assert "mismatch" in (resp.get_json().get("error") or "").lower()


# ---------------------------------------------------------------------------
# GET /api/game/pixelated/albums-list  (full catalog; filtered client-side)
# ---------------------------------------------------------------------------

def test_albums_list_returns_published_with_group_name(client, make_group, make_album):
    gid = make_group("Stellar")
    make_album("Galaxy Lights", gid)

    resp = client.get(f"/api/game/pixelated/albums-list?gamemode_id={GM}")
    assert resp.status_code == 200
    body = resp.get_json()

    row = next((r for r in body if r["name"] == "Galaxy Lights"), None)
    assert row is not None
    assert row["group_name"] == "Stellar"
    # Shape the client filter/guess-build depends on.
    for key in ("id", "name", "group_name", "cover_path", "type", "release_year"):
        assert key in row


def test_albums_list_empty_when_no_published(client):
    resp = client.get(f"/api/game/pixelated/albums-list?gamemode_id={GM}")
    assert resp.status_code == 200
    assert resp.get_json() == []


# ---------------------------------------------------------------------------
# Regression: Winning writes score AND bumps user_history.wins_count
# ---------------------------------------------------------------------------

def test_winning_writes_score_and_increments_user_history(client, db_conn, make_user, make_group, make_album, set_daily_pick, today):
    user_id, token = make_user()
    gid = make_group("Pixie")
    aid = make_album("Cosmic Dream", gid)
    set_daily_pick(aid, GM)

    resp = client.post(
        f"/api/game/pixelated/guess?gamemode_id={GM}",
        json={"album_id": aid, "current_attempt": 1, "game_date": today},
        headers={"Authorization": token},
    )
    assert resp.status_code == 200
    assert resp.get_json()["guess_correct"] is True

    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT score, won, one_shot_win, guesses_count
            FROM daily_user_history
            WHERE user_id = %s AND date = %s AND gamemode_id = %s
            """,
            (user_id, today, GM),
        )
        row = cur.fetchone()
        assert row is not None, "daily_user_history row should exist after win"
        assert row["score"] is not None and row["score"] > 0
        assert row["won"] is True
        assert row["one_shot_win"] is True
        assert row["guesses_count"] == 1

        cur.execute(
            """
            SELECT wins_count, current_streak, max_streak, one_shot_wins
            FROM user_history
            WHERE user_id = %s AND gamemode_id = %s
            """,
            (user_id, GM),
        )
        agg = cur.fetchone()
        assert agg is not None, "user_history row should exist after win"
        assert agg["wins_count"] == 1
        assert agg["current_streak"] == 1
        assert agg["max_streak"] == 1
        assert agg["one_shot_wins"] == 1


# ===========================================================================
# A. Daily album — response shape, pick creation, idempotency
# ===========================================================================

def test_daily_album_full_response_shape(client, make_group, make_album):
    gid = make_group("Aurora")
    make_album("Polar Night", gid, "/covers/polar.jpg")

    resp = client.get(f"/api/game/pixelated/daily-album?gamemode_id={GM}")
    assert resp.status_code == 200
    body = resp.get_json()

    for key in ("answer_id", "group_name", "cover_path", "palette", "type", "release_year", "server_date"):
        assert key in body, f"missing key: {key}"
    # The answer must never be revealed by name in the daily-album payload.
    assert "name" not in body
    assert body["group_name"] == "Aurora"
    assert body["cover_path"] == "/covers/polar.jpg"


def test_daily_album_creates_daily_pick_row(client, db_conn, make_group, make_album, today):
    gid = make_group("Aurora")
    aid = make_album("Polar Night", gid)

    resp = client.get(f"/api/game/pixelated/daily-album?gamemode_id={GM}")
    assert resp.status_code == 200
    answer_id = resp.get_json()["answer_id"]
    # Only one published album exists, so the real selection path must pick it.
    assert answer_id == aid

    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT album_id, idol_id FROM daily_picks WHERE pick_date = %s AND gamemode_id = %s",
            (today, GM),
        )
        row = cur.fetchone()
        assert row is not None, "daily_picks row should exist after daily-album"
        assert row["album_id"] == answer_id
        # Pixelated picks are album-based; idol_id must stay NULL.
        assert row["idol_id"] is None


def test_daily_album_is_idempotent(client, db_conn, make_group, make_album, today):
    gid = make_group("Aurora")
    make_album("Polar Night", gid)
    make_album("Second Album", gid)  # >1 candidate so a re-pick *could* differ

    first = client.get(f"/api/game/pixelated/daily-album?gamemode_id={GM}").get_json()["answer_id"]
    second = client.get(f"/api/game/pixelated/daily-album?gamemode_id={GM}").get_json()["answer_id"]
    assert first == second

    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) AS n FROM daily_picks WHERE pick_date = %s AND gamemode_id = %s",
            (today, GM),
        )
        assert cur.fetchone()["n"] == 1


def test_daily_album_palette_roundtrips_as_jsonb(client, db_conn, make_group):
    gid = make_group("Aurora")
    # Insert an album with a real JSONB palette (make_album leaves it NULL).
    import json
    palette = ["#112233", "#445566", "#778899"]
    with db_conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO albums (name, group_id, type, release_date, cover_path, palette, is_published)
            VALUES (%s, %s, 'Studio Album', '2020-01-01', %s, %s, TRUE)
            RETURNING id
            """,
            ("Palette Album", gid, "/covers/pal.jpg", json.dumps(palette)),
        )
        cur.fetchone()
    db_conn.commit()

    body = client.get(f"/api/game/pixelated/daily-album?gamemode_id={GM}").get_json()
    # JSONB must deserialize back into the original Python structure, not a string.
    assert body["palette"] == palette
    assert isinstance(body["palette"], list)


# ===========================================================================
# B. Guess — incorrect side effects
# ===========================================================================

def test_guess_incorrect_writes_attempt_not_win(client, db_conn, make_user, make_group, make_album, set_daily_pick, today):
    user_id, token = make_user()
    gid = make_group("Pixie")
    correct_aid = make_album("Cosmic Dream", gid)
    wrong_aid = make_album("Other Album", gid)
    set_daily_pick(correct_aid, GM)

    resp = client.post(
        f"/api/game/pixelated/guess?gamemode_id={GM}",
        json={"album_id": wrong_aid, "current_attempt": 3, "game_date": today},
        headers={"Authorization": token},
    )
    assert resp.status_code == 200
    assert resp.get_json()["guess_correct"] is False

    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT guesses_count, won, one_shot_win, score, won_at
            FROM daily_user_history
            WHERE user_id = %s AND date = %s AND gamemode_id = %s
            """,
            (user_id, today, GM),
        )
        row = cur.fetchone()
        assert row is not None, "an attempt row should be written even on a miss"
        assert row["won"] is False
        assert row["one_shot_win"] is False
        assert row["guesses_count"] == 3
        assert row["won_at"] is None
        # score column defaults to 0 and is only updated on a win.
        assert row["score"] == 0

        # An incorrect guess must NOT create / touch aggregate stats.
        cur.execute(
            "SELECT 1 FROM user_history WHERE user_id = %s AND gamemode_id = %s",
            (user_id, GM),
        )
        assert cur.fetchone() is None, "user_history must not exist after only a miss"


# ===========================================================================
# C. Guess — correct side effects (exact columns)
# ===========================================================================

def test_guess_correct_populates_daily_user_history(client, db_conn, make_user, make_group, make_album, set_daily_pick, today):
    user_id, token = make_user()
    gid = make_group("Pixie")
    aid = make_album("Cosmic Dream", gid)
    set_daily_pick(aid, GM)

    resp = client.post(
        f"/api/game/pixelated/guess?gamemode_id={GM}",
        json={"album_id": aid, "current_attempt": 2, "game_date": today},
        headers={"Authorization": token},
    )
    assert resp.status_code == 200
    assert resp.get_json()["guess_correct"] is True

    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT guesses_count, won, one_shot_win, score, won_at, started_at
            FROM daily_user_history
            WHERE user_id = %s AND date = %s AND gamemode_id = %s
            """,
            (user_id, today, GM),
        )
        row = cur.fetchone()
        assert row is not None
        assert row["won"] is True
        assert row["one_shot_win"] is False  # attempt != 1
        assert row["guesses_count"] == 2
        # score = 10 * round(exp(-0.1 * (n - 1)), 3) for n = 2.
        expected = 10 * round(math.exp(-0.1 * (2 - 1)), 3)
        assert row["score"] == pytest.approx(expected, abs=1e-3)
        assert row["won_at"] is not None
        # started_at is only stamped on attempt 1.
        assert row["started_at"] is None


def test_guess_correct_one_shot_populates_all_tables(client, db_conn, make_user, make_group, make_album, set_daily_pick, today):
    """Full audited write-set for a one-shot win. Prints every row so a human
    can eyeball correctness (run with -s)."""
    user_id, token = make_user()
    gid = make_group("Pixie")
    aid = make_album("Cosmic Dream", gid)
    set_daily_pick(aid, GM)

    resp = client.post(
        f"/api/game/pixelated/guess?gamemode_id={GM}",
        json={"album_id": aid, "current_attempt": 1, "game_date": today},
        headers={"Authorization": token},
    )
    assert resp.status_code == 200
    assert resp.get_json()["guess_correct"] is True

    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT user_id, date, gamemode_id, guesses_count, won, one_shot_win,
                   score, won_at, started_at
            FROM daily_user_history
            WHERE user_id = %s AND date = %s AND gamemode_id = %s
            """,
            (user_id, today, GM),
        )
        duh = cur.fetchone()
        print("\n[audit] daily_user_history:", dict(duh))
        assert duh["won"] is True
        assert duh["one_shot_win"] is True
        assert duh["guesses_count"] == 1
        assert duh["score"] == pytest.approx(10.0, abs=1e-3)
        assert duh["won_at"] is not None
        assert duh["started_at"] is not None

        cur.execute(
            """
            SELECT user_id, gamemode_id, wins_count, current_streak, max_streak,
                   one_shot_wins, average_guesses, last_played_date
            FROM user_history
            WHERE user_id = %s AND gamemode_id = %s
            """,
            (user_id, GM),
        )
        uh = cur.fetchone()
        print("[audit] user_history:", dict(uh))
        assert uh["wins_count"] == 1
        assert uh["current_streak"] == 1
        assert uh["max_streak"] == 1
        assert uh["one_shot_wins"] == 1
        assert uh["average_guesses"] == pytest.approx(1.0, abs=1e-3)
        assert str(uh["last_played_date"]) == today


# ===========================================================================
# D. Integrity — NOT NULL columns + post-win current behavior
# ===========================================================================

def test_no_null_in_required_columns(client, db_conn, make_user, make_group, make_album, set_daily_pick, today):
    user_id, token = make_user()
    gid = make_group("Pixie")
    aid = make_album("Cosmic Dream", gid)
    set_daily_pick(aid, GM)

    resp = client.post(
        f"/api/game/pixelated/guess?gamemode_id={GM}",
        json={"album_id": aid, "current_attempt": 1, "game_date": today},
        headers={"Authorization": token},
    )
    assert resp.status_code == 200

    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT user_id, date, gamemode_id
            FROM daily_user_history
            WHERE user_id = %s AND date = %s AND gamemode_id = %s
            """,
            (user_id, today, GM),
        )
        duh = cur.fetchone()
        assert duh is not None
        for col in ("user_id", "date", "gamemode_id"):
            assert duh[col] is not None, f"daily_user_history.{col} must not be NULL"

        cur.execute(
            "SELECT user_id, gamemode_id FROM user_history WHERE user_id = %s AND gamemode_id = %s",
            (user_id, GM),
        )
        uh = cur.fetchone()
        assert uh is not None
        for col in ("user_id", "gamemode_id"):
            assert uh[col] is not None, f"user_history.{col} must not be NULL"


def test_post_win_guess_current_behavior(client, db_conn, make_user, make_group, make_album, set_daily_pick, today):
    """KNOWN DESIGN CHOICE: there is no server-side win-lock. A correct guess
    submitted after the game is already won is still accepted (200,
    guess_correct=True), but the `already_won_today` guard keeps aggregate
    stats from being double-counted. This locks in CURRENT behavior."""
    user_id, token = make_user()
    gid = make_group("Pixie")
    aid = make_album("Cosmic Dream", gid)
    set_daily_pick(aid, GM)

    url = f"/api/game/pixelated/guess?gamemode_id={GM}"
    first = client.post(url, json={"album_id": aid, "current_attempt": 1, "game_date": today}, headers={"Authorization": token})
    assert first.status_code == 200 and first.get_json()["guess_correct"] is True

    second = client.post(url, json={"album_id": aid, "current_attempt": 2, "game_date": today}, headers={"Authorization": token})
    # Not rejected — current behavior accepts the post-win guess.
    assert second.status_code == 200
    assert second.get_json()["guess_correct"] is True

    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT wins_count, one_shot_wins FROM user_history WHERE user_id = %s AND gamemode_id = %s",
            (user_id, GM),
        )
        agg = cur.fetchone()
        # Win counted exactly once despite the replay.
        assert agg["wins_count"] == 1
        assert agg["one_shot_wins"] == 1


# ===========================================================================
# E. yesterday_picks — store-yesterdays-album / -idol
# ===========================================================================

def test_store_yesterdays_album_sets_past_album_id(client, db_conn, make_group, make_album, set_yesterday_album_pick):
    gid = make_group("Pixie")
    aid = make_album("Yesterday Album", gid)
    yesterday = set_yesterday_album_pick(aid, GM)

    resp = client.get(f"/api/store-yesterdays-album?gamemode_id={GM}")
    assert resp.status_code == 200
    assert resp.get_json()["past_album_id"] == aid

    with db_conn.cursor() as cur:
        cur.execute(
            """
            SELECT past_album_id, past_idol_id
            FROM yesterday_picks
            WHERE yesterdays_pick_date = %s AND gamemode_id = %s
            """,
            (yesterday, GM),
        )
        row = cur.fetchone()
        assert row is not None
        assert row["past_album_id"] == aid
        # Album mode must leave past_idol_id NULL; row existence proves
        # chk_past_id_not_both_null was satisfied.
        assert row["past_idol_id"] is None


def test_store_yesterdays_idol_gm3_falls_through(client, db_conn, make_group, make_album, set_yesterday_album_pick):
    gid = make_group("Pixie")
    aid = make_album("Yesterday Album", gid)
    yesterday = set_yesterday_album_pick(aid, GM)

    # gamemode 3's daily pick has idol_id = NULL, so the idol endpoint must
    # fall through gracefully without inserting a NULL past_idol_id or 500ing.
    resp = client.get(f"/api/store-yesterdays-idol?gamemode_id={GM}")
    assert resp.status_code == 200
    assert "First day" in (resp.get_json().get("message") or "")

    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM yesterday_picks WHERE yesterdays_pick_date = %s AND gamemode_id = %s",
            (yesterday, GM),
        )
        assert cur.fetchone() is None, "no yesterday_picks row should be written for gm3 via the idol endpoint"


# ===========================================================================
# F. Soloist album branch (group_id = 20 / soloist_id)
# ===========================================================================

def test_daily_album_soloist_uses_artist_name(client, make_soloist_album):
    make_soloist_album("Solo Debut", artist_name="Luna")

    body = client.get(f"/api/game/pixelated/daily-album?gamemode_id={GM}").get_json()
    # COALESCE(i.artist_name, g.name) → artist_name for soloists.
    assert body["group_name"] == "Luna"
    assert "name" not in body


def test_guess_correct_soloist_album(client, db_conn, make_user, make_soloist_album, set_daily_pick, today):
    user_id, token = make_user()
    aid, artist_name = make_soloist_album("Solo Debut", artist_name="Luna")
    set_daily_pick(aid, GM)

    resp = client.post(
        f"/api/game/pixelated/guess?gamemode_id={GM}",
        json={"album_id": aid, "current_attempt": 1, "game_date": today},
        headers={"Authorization": token},
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["guess_correct"] is True
    assert body["guessed_album_data"]["group_name"] == artist_name

    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT won, one_shot_win FROM daily_user_history WHERE user_id = %s AND date = %s AND gamemode_id = %s",
            (user_id, today, GM),
        )
        duh = cur.fetchone()
        assert duh["won"] is True and duh["one_shot_win"] is True
        cur.execute(
            "SELECT wins_count FROM user_history WHERE user_id = %s AND gamemode_id = %s",
            (user_id, GM),
        )
        assert cur.fetchone()["wins_count"] == 1


# ===========================================================================
# G1. Payload validation
# ===========================================================================

def test_guess_missing_album_id_returns_400(client, make_user, make_group, make_album, set_daily_pick, today):
    _, token = make_user()
    gid = make_group("Pixie")
    aid = make_album("Cosmic Dream", gid)
    set_daily_pick(aid, GM)

    resp = client.post(
        f"/api/game/pixelated/guess?gamemode_id={GM}",
        json={"current_attempt": 1, "game_date": today},
        headers={"Authorization": token},
    )
    assert resp.status_code == 400
    assert "album_id" in (resp.get_json().get("error") or "")


def test_guess_missing_current_attempt_returns_400(client, make_user, make_group, make_album, set_daily_pick, today):
    _, token = make_user()
    gid = make_group("Pixie")
    aid = make_album("Cosmic Dream", gid)
    set_daily_pick(aid, GM)

    resp = client.post(
        f"/api/game/pixelated/guess?gamemode_id={GM}",
        json={"album_id": aid, "game_date": today},
        headers={"Authorization": token},
    )
    assert resp.status_code == 400
    assert "current_attempt" in (resp.get_json().get("error") or "")


def test_guess_empty_body_returns_400(client, make_user):
    _, token = make_user()
    resp = client.post(
        f"/api/game/pixelated/guess?gamemode_id={GM}",
        json={},
        headers={"Authorization": token},
    )
    assert resp.status_code == 400


# ===========================================================================
# G2. Auth-source branches
# ===========================================================================

def test_guess_body_user_token_succeeds(client, db_conn, make_user, make_group, make_album, set_daily_pick, today):
    """No Authorization header → falls to the body user_token branch."""
    user_id, token = make_user()
    gid = make_group("Pixie")
    aid = make_album("Cosmic Dream", gid)
    set_daily_pick(aid, GM)

    resp = client.post(
        f"/api/game/pixelated/guess?gamemode_id={GM}",
        json={"album_id": aid, "current_attempt": 1, "game_date": today, "user_token": token},
    )
    assert resp.status_code == 200
    assert resp.get_json()["guess_correct"] is True

    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT won FROM daily_user_history WHERE user_id = %s AND date = %s AND gamemode_id = %s",
            (user_id, today, GM),
        )
        assert cur.fetchone()["won"] is True


def test_guess_invalid_body_user_token_returns_400(client, make_group, make_album, set_daily_pick, today):
    gid = make_group("Pixie")
    aid = make_album("Cosmic Dream", gid)
    set_daily_pick(aid, GM)

    resp = client.post(
        f"/api/game/pixelated/guess?gamemode_id={GM}",
        json={"album_id": aid, "current_attempt": 1, "game_date": today, "user_token": str(uuid.uuid4())},
    )
    assert resp.status_code == 400
    assert "Invalid user token" in (resp.get_json().get("error") or "")


def test_guess_invalid_anonymous_header_returns_400(client, make_group, make_album, set_daily_pick, today):
    gid = make_group("Pixie")
    aid = make_album("Cosmic Dream", gid)
    set_daily_pick(aid, GM)

    resp = client.post(
        f"/api/game/pixelated/guess?gamemode_id={GM}",
        json={"album_id": aid, "current_attempt": 1, "game_date": today},
        headers={"Authorization": str(uuid.uuid4())},
    )
    assert resp.status_code == 400
    assert "Invalid user token" in (resp.get_json().get("error") or "")


# ===========================================================================
# G3. Non-existent album_id guess
# ===========================================================================

def test_guess_nonexistent_album_id_returns_false_with_null_data(client, make_user, make_group, make_album, set_daily_pick, today):
    _, token = make_user()
    gid = make_group("Pixie")
    aid = make_album("Cosmic Dream", gid)
    set_daily_pick(aid, GM)

    missing_id = aid + 9999
    resp = client.post(
        f"/api/game/pixelated/guess?gamemode_id={GM}",
        json={"album_id": missing_id, "current_attempt": 1, "game_date": today},
        headers={"Authorization": token},
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["guess_correct"] is False
    data = body["guessed_album_data"]
    assert data["album_id"] == missing_id
    assert data["album_name"] is None
    assert data["group_name"] is None
    assert data["cover_path"] is None
