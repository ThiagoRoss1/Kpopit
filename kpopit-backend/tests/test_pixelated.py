"""Integration tests for the Pixelated gamemode (gamemode_id = 3).

These Act as regression tests (aggregate stats + score on a win).
"""

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
    assert "group_name" not in body


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
# GET /api/game/pixelated/albums/search
# ---------------------------------------------------------------------------

def test_search_matches_album_or_group_name(client, make_group, make_album):
    gid = make_group("Stellar")
    make_album("Galaxy Lights", gid)

    by_album = client.get(f"/api/game/pixelated/albums/search?q=Galaxy&gamemode_id={GM}")
    assert by_album.status_code == 200
    assert any(r["name"] == "Galaxy Lights" for r in by_album.get_json())

    by_group = client.get(f"/api/game/pixelated/albums/search?q=Stellar&gamemode_id={GM}")
    assert by_group.status_code == 200
    assert any(r["group_name"] == "Stellar" for r in by_group.get_json())


def test_search_empty_query_returns_empty_list(client):
    resp = client.get(f"/api/game/pixelated/albums/search?q=&gamemode_id={GM}")
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
