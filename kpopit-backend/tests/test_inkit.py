"""InkIt (gamemode 4): the day payload never names the answer before the win, guesses are
server-owned and carry the drawing in the same transaction, hints unlock by round, and the mode
shows up in calendar, restore, stats, ranking and the card grant like the other modes."""

import base64
import json
import os
import re
import subprocess
import sys
import zlib
from datetime import timedelta

import pytest

from services.inkit_mode import DRAFT_MAX_BYTES, DRAFT_RAW_LENGTH, SEED_PHOTOS_FROM_BLURRY_SQL
from utils import dates

MODE = 4
SECRET_NAME = "Secret Answer"


def draft(fill: int = 0, version: int = 1, length: int = DRAFT_RAW_LENGTH - 1) -> str:
    """The client's format: deflate of [version byte + `length` packed bytes], as base64."""
    return base64.b64encode(zlib.compress(bytes([version]) + bytes([fill]) * length)).decode("ascii")


def pencil_path(idol_id: int) -> str:
    return f"/images/inkit/pencil/{(idol_id << 8) | 1:032x}.webp"


def pen_path(idol_id: int) -> str:
    return f"/images/inkit/pen/{(idol_id << 8) | 2:032x}.webp"


def day(offset: int) -> str:
    return (dates.get_today_date() + timedelta(days=offset)).isoformat()


@pytest.fixture
def inkit_idol(db_conn, make_idol):
    """A published idol with an active InkIt photo under an opaque path."""

    def _make(name, active=True):
        idol_id = make_idol(name, image_path=f"/images/idols/{name.lower().replace(' ', '_')}.webp")
        with db_conn.cursor() as cur:
            cur.execute(
                "INSERT INTO inkit_mode_data (idol_id, image_path, pencil_path, pen_path, is_active) "
                "VALUES (%s, %s, %s, %s, %s)",
                (idol_id, f"/images/inkit/{idol_id:032x}.webp", pencil_path(idol_id), pen_path(idol_id), active),
            )
        db_conn.commit()
        return idol_id

    return _make


@pytest.fixture
def pin(db_conn):
    def _pin(idol_id, offset=0):
        with db_conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO daily_picks (pick_date, idol_id, gamemode_id) VALUES (%s, %s, %s)
                ON CONFLICT (pick_date, gamemode_id) DO UPDATE SET idol_id = EXCLUDED.idol_id
                """,
                (day(offset), idol_id, MODE),
            )
        db_conn.commit()

    return _pin


@pytest.fixture
def game(inkit_idol, pin, make_user):
    """Today's answer, ten wrong idols and a player."""
    answer = inkit_idol(SECRET_NAME)
    wrong = [inkit_idol(f"Wrong {index}") for index in range(10)]
    pin(answer)
    user_id, token = make_user()
    return {"answer": answer, "wrong": wrong, "user_id": user_id, "token": token}


def daily(client, token=None):
    return client.get("/api/game/inkit/daily?gamemode_id=4", headers={"Authorization": token} if token else {})


def guess(client, token, guessed, **body):
    return client.post(
        "/api/game/inkit/guess?gamemode_id=4",
        json={"guessed_idol_id": guessed, "game_date": dates.get_today_date_str(), **body},
        headers={"Authorization": token},
    )


def hint(client, token, game_date=None):
    return client.post(
        "/api/game/inkit/hint?gamemode_id=4",
        json={"game_date": game_date or dates.get_today_date_str()},
        headers={"Authorization": token},
    )


def history_row(db_conn, user_id, game_date=None):
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT guessed_ids, guesses_count, won, one_shot_win, score, is_calendar FROM daily_user_history "
            "WHERE user_id = %s AND date = %s AND gamemode_id = %s",
            (user_id, game_date or dates.get_today_date_str(), MODE),
        )
        return cur.fetchone()


def draft_row(db_conn, user_id, game_date=None):
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT masks, hint_ink_guess, updated_at FROM inkit_drafts WHERE user_id = %s AND game_date = %s",
            (user_id, game_date or dates.get_today_date_str()),
        )
        return cur.fetchone()


def names_nothing(body, answer_id) -> bool:
    """True when a response neither names the answer nor carries its id."""
    text = json.dumps(body)
    return (SECRET_NAME not in text and "secret_answer" not in text
            and not re.search(rf'"idol_id": {answer_id}\b', text))


# --- Day payload -----------------------------------------------------------


def test_day_payload_has_the_photo_and_never_the_answer(client, game):
    res = daily(client)
    body = res.get_json()

    assert res.status_code == 200
    assert set(body) == {"image_path", "image_version", "day_number", "game", "server_date"}
    assert body["image_path"] == f"/images/inkit/{game['answer']:032x}.webp"
    assert body["day_number"] == 1 and body["game"] is None
    assert body["server_date"] == dates.get_today_date_str()
    assert names_nothing(body, game["answer"])
    assert res.headers["Cache-Control"] == "private, no-store"


def test_day_payload_stays_secret_through_wrong_guesses(client, game):
    for wrong in game["wrong"][:9]:
        body = guess(client, game["token"], wrong).get_json()
        assert body["guess_correct"] is False and body["answer"] is None
        assert names_nothing(body, game["answer"])

    body = daily(client, game["token"]).get_json()
    assert body["game"]["answer"] is None and body["game"]["game_won"] is False
    assert names_nothing(body, game["answer"])


def test_tomorrows_pick_is_drawn_but_never_returned(client, db_conn, game):
    body = daily(client).get_json()
    with db_conn.cursor() as cur:
        cur.execute("SELECT pick_date, idol_id FROM daily_picks WHERE gamemode_id = %s ORDER BY pick_date", (MODE,))
        picks = cur.fetchall()

    assert [pick["pick_date"].isoformat() for pick in picks] == [day(0), day(1)]
    assert body["image_path"] != f"/images/inkit/{picks[1]['idol_id']:032x}.webp" or picks[1]["idol_id"] == game["answer"]


def test_expired_bearer_token_is_rejected(client, game):
    assert client.get("/api/game/inkit/daily", headers={"Authorization": "Bearer nope"}).status_code == 401


# --- Guess flow ------------------------------------------------------------


def test_wrong_then_right_guess(client, db_conn, game):
    first = guess(client, game["token"], game["wrong"][0], draft=draft(1)).get_json()
    assert first["guess_correct"] is False and first["guesses_count"] == 1
    assert first["guessed_idol_data"]["artist_name"] == "Wrong 0"
    assert first["answer"] is None and first["group_hint"] is None

    won = guess(client, game["token"], game["answer"], draft=draft(2)).get_json()
    assert won["guess_correct"] is True and won["guesses_count"] == 2
    assert won["answer"]["idol_id"] == game["answer"] and won["answer"]["artist_name"] == SECRET_NAME

    row = history_row(db_conn, game["user_id"])
    assert row["guessed_ids"] == [game["wrong"][0], game["answer"]]
    assert row["won"] is True and row["one_shot_win"] is False
    assert float(row["score"]) == pytest.approx(9.05)


def test_the_body_cannot_set_the_answer_or_the_attempt(client, db_conn, game):
    body = guess(client, game["token"], game["wrong"][0], answer_id=game["wrong"][0], current_attempt=1).get_json()
    assert body["guess_correct"] is False

    guess(client, game["token"], game["wrong"][1], current_attempt=1)
    won = guess(client, game["token"], game["answer"], current_attempt=1).get_json()
    assert won["guesses_count"] == 3
    assert history_row(db_conn, game["user_id"])["one_shot_win"] is False


def test_one_shot_win(client, db_conn, game):
    assert guess(client, game["token"], game["answer"]).get_json()["guess_correct"] is True
    row = history_row(db_conn, game["user_id"])
    assert row["one_shot_win"] is True and float(row["score"]) == 10


def test_repeated_and_post_win_guesses_are_not_recorded(client, db_conn, game):
    guess(client, game["token"], game["wrong"][0])
    guess(client, game["token"], game["wrong"][0])
    assert history_row(db_conn, game["user_id"])["guesses_count"] == 1

    guess(client, game["token"], game["answer"], draft=draft(3))
    after = guess(client, game["token"], game["wrong"][1], draft=draft(9)).get_json()
    assert after["guess_correct"] is False and after["guesses_count"] == 2
    assert bytes(draft_row(db_conn, game["user_id"])["masks"]) == base64.b64decode(draft(3))


@pytest.mark.parametrize("guessed", [None, 0, -1, "1", 1.5, True, [1], 999_999])
def test_bad_guess_ids_are_rejected(client, db_conn, game, guessed):
    res = guess(client, game["token"], guessed)
    assert res.status_code in (400, 404)
    assert history_row(db_conn, game["user_id"]) is None


def test_guess_needs_identity_and_todays_date(client, game):
    today = dates.get_today_date_str()
    no_token = client.post("/api/game/inkit/guess", json={"guessed_idol_id": game["answer"], "game_date": today})
    assert no_token.status_code == 400 and no_token.get_json() == {"error": "Missing user token"}

    unknown = guess(client, "00000000-0000-4000-8000-000000000000", game["answer"])
    assert unknown.status_code == 400 and unknown.get_json() == {"error": "Invalid user token"}

    stale = client.post("/api/game/inkit/guess", json={"guessed_idol_id": game["answer"], "game_date": day(-1)},
                        headers={"Authorization": game["token"]})
    assert stale.status_code == 400 and stale.get_json() == {"error": "Game date mismatch"}


@pytest.mark.parametrize("body", ["[1, 2]", "\"text\"", "not json", "null"])
def test_non_object_bodies_are_rejected(client, game, body):
    res = client.post("/api/game/inkit/guess", data=body, content_type="application/json",
                      headers={"Authorization": game["token"]})
    assert res.status_code == 400


def test_errors_never_name_the_answer(client, game):
    for res in (guess(client, game["token"], 999_999), guess(client, game["token"], game["wrong"][0], draft="x")):
        assert names_nothing(res.get_json(), game["answer"])


# --- Drawing ---------------------------------------------------------------


def test_drawing_is_saved_with_each_guess_and_restored(client, db_conn, game):
    guess(client, game["token"], game["wrong"][0], draft=draft(1))
    assert bytes(draft_row(db_conn, game["user_id"])["masks"]) == base64.b64decode(draft(1))

    guess(client, game["token"], game["wrong"][1], draft=draft(2))
    restored = daily(client, game["token"]).get_json()["game"]
    assert restored["draft"] == draft(2)
    assert [entry["artist_name"] for entry in restored["inkit_guesses"]] == ["Wrong 0", "Wrong 1"]
    assert restored["guesses_count"] == 2 and restored["game_date"] == dates.get_today_date_str()

    with db_conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS n FROM inkit_drafts WHERE user_id = %s", (game["user_id"],))
        assert cur.fetchone()["n"] == 1


def test_a_guess_without_a_drawing_keeps_the_last_one(client, db_conn, game):
    guess(client, game["token"], game["wrong"][0], draft=draft(1))
    assert guess(client, game["token"], game["wrong"][1]).status_code == 200
    assert bytes(draft_row(db_conn, game["user_id"])["masks"]) == base64.b64decode(draft(1))


def test_drawing_is_kept_after_the_win(client, db_conn, game):
    guess(client, game["token"], game["answer"], draft=draft(7))
    assert bytes(draft_row(db_conn, game["user_id"])["masks"]) == base64.b64decode(draft(7))
    assert daily(client, game["token"]).get_json()["game"]["draft"] == draft(7)


def _bomb() -> str:
    return base64.b64encode(zlib.compress(bytes([1]) + bytes(50 * 1024 * 1024), 9)).decode("ascii")


@pytest.mark.parametrize("bad", [
    draft(version=2),
    draft(length=DRAFT_RAW_LENGTH - 2),
    draft(length=DRAFT_RAW_LENGTH),
    "not base64 !!",
    "",
    base64.b64encode(b"not deflate").decode("ascii"),
    base64.b64encode(zlib.compress(b"")).decode("ascii"),
    base64.b64encode(zlib.compress(bytes([1]) + bytes(DRAFT_RAW_LENGTH - 1)) + b"extra").decode("ascii"),
    base64.b64encode(os.urandom(DRAFT_MAX_BYTES + 1)).decode("ascii"),
    # The old layout (version byte outside the deflate stream).
    base64.b64encode(bytes([1]) + zlib.compress(bytes(DRAFT_RAW_LENGTH - 1))).decode("ascii"),
    123,
    ["a"],
    # Named cases: pytest puts the test id in an environment variable, and Windows refuses one
    # over 32767 characters (the oversized drawing as its own id).
], ids=[
    "wrong-version", "too-short", "too-long", "not-base64", "empty", "not-deflate", "empty-deflate",
    "trailing-bytes", "over-max-bytes", "old-layout", "a-number", "a-list",
])
def test_bad_drawings_are_rejected_and_the_guess_is_not_recorded(client, db_conn, game, bad):
    res = guess(client, game["token"], game["wrong"][0], draft=bad)
    assert res.status_code == 400 and res.get_json() == {"error": "Invalid drawing"}
    assert history_row(db_conn, game["user_id"]) is None and draft_row(db_conn, game["user_id"]) is None


def test_a_deflate_bomb_is_rejected_without_inflating_it(client, db_conn, game):
    res = guess(client, game["token"], game["wrong"][0], draft=_bomb())
    assert res.status_code == 400
    assert history_row(db_conn, game["user_id"]) is None


def test_oversized_bodies_are_rejected(client, db_conn, game):
    res = guess(client, game["token"], game["wrong"][0], padding="x" * (70 * 1024))
    assert res.status_code == 400 and res.get_json() == {"error": "Invalid request"}
    assert history_row(db_conn, game["user_id"]) is None


def test_a_player_never_sees_another_players_drawing(client, game, make_user):
    guess(client, game["token"], game["wrong"][0], draft=draft(5))
    _, other = make_user()
    assert daily(client, other).get_json()["game"] is None


# --- Hints -----------------------------------------------------------------


def test_ink_hint_only_from_round_five_and_once(client, db_conn, game):
    assert hint(client, game["token"]).status_code == 400
    for wrong in game["wrong"][:3]:
        guess(client, game["token"], wrong, draft=draft(1))
    refused = hint(client, game["token"])
    assert refused.status_code == 400 and refused.get_json() == {"error": "Hint not available yet"}

    guess(client, game["token"], game["wrong"][3], draft=draft(1))
    used = hint(client, game["token"])
    assert used.status_code == 200 and used.get_json() == {"hint_ink_guess": 5, "unlock_round": 5}

    again = hint(client, game["token"])
    assert again.status_code == 409 and again.get_json() == {"error": "Hint already used"}

    guess(client, game["token"], game["wrong"][4], draft=draft(2))
    assert draft_row(db_conn, game["user_id"])["hint_ink_guess"] == 5
    assert daily(client, game["token"]).get_json()["game"]["hint_ink_guess"] == 5


def test_ink_hint_stores_the_round_it_was_used_in(client, game):
    for wrong in game["wrong"][:6]:
        guess(client, game["token"], wrong)
    assert hint(client, game["token"]).get_json()["hint_ink_guess"] == 7


def test_ink_hint_works_without_any_saved_drawing(client, db_conn, game):
    for wrong in game["wrong"][:4]:
        guess(client, game["token"], wrong)
    assert hint(client, game["token"]).status_code == 200
    assert draft_row(db_conn, game["user_id"])["masks"] is None


def test_ink_hint_is_refused_after_the_win(client, game):
    for wrong in game["wrong"][:4]:
        guess(client, game["token"], wrong)
    guess(client, game["token"], game["answer"])
    assert hint(client, game["token"]).status_code == 409


def test_group_hint_from_round_eight(client, db_conn, game, make_group, make_career):
    make_career(game["answer"], make_group("Hint Group"))

    for wrong in game["wrong"][:6]:
        assert guess(client, game["token"], wrong).get_json()["group_hint"] is None
    assert daily(client, game["token"]).get_json()["game"]["group_hint"] is None

    seventh = guess(client, game["token"], game["wrong"][6]).get_json()
    assert seventh["group_hint"] == ["Hint Group"] and seventh["answer"] is None
    assert daily(client, game["token"]).get_json()["game"]["group_hint"] == ["Hint Group"]


# --- Daily draw and cleanup --------------------------------------------------


def test_only_published_idols_with_an_active_photo_are_drawn(client, db_conn, inkit_idol, make_idol):
    make_idol("No Photo")
    inkit_idol("Inactive Photo", active=False)
    only = inkit_idol("Only One")

    assert daily(client).get_json()["image_path"] == f"/images/inkit/{only:032x}.webp"


def test_no_eligible_idol_is_a_404(client):
    assert daily(client).status_code == 404


def test_old_drawings_are_deleted_by_the_daily_draw(client, db_conn, game, pin):
    past = game["wrong"][5]
    pin(past, offset=-5)
    guess(client, game["token"], game["wrong"][0], draft=draft(1))
    played_today = client.post(
        f"/api/calendar/inkit/{day(-5)}/guess", json={"guessed_idol_id": game["wrong"][1], "draft": draft(2)},
        headers={"Authorization": game["token"]},
    )
    assert played_today.status_code == 200

    # Two calendar days whose drawings go stale: one left unfinished, one won.
    unfinished, won = game["wrong"][6], game["wrong"][7]
    pin(unfinished, offset=-4)
    pin(won, offset=-6)
    for offset, guessed in ((-4, game["wrong"][2]), (-6, won)):
        response = client.post(
            f"/api/calendar/inkit/{day(offset)}/guess", json={"guessed_idol_id": guessed, "draft": draft(3)},
            headers={"Authorization": game["token"]},
        )
        assert response.status_code == 200

    with db_conn.cursor() as cur:
        cur.execute(
            "UPDATE inkit_drafts SET updated_at = CURRENT_TIMESTAMP - INTERVAL '3 days' WHERE user_id = %s AND game_date IN (%s, %s)",
            (game["user_id"], day(-4), day(-6)),
        )
        cur.execute(
            "INSERT INTO inkit_drafts (user_id, game_date, masks, updated_at) VALUES (%s, %s, %s, CURRENT_TIMESTAMP - INTERVAL '3 days')",
            (game["user_id"], day(-3), b"\x01old"),
        )
        cur.execute(
            "INSERT INTO inkit_drafts (user_id, game_date, masks, updated_at) VALUES (%s, %s, %s, CURRENT_TIMESTAMP - INTERVAL '1 day')",
            (game["user_id"], day(-1), b"\x01recent"),
        )
        cur.execute("DELETE FROM daily_picks WHERE gamemode_id = %s AND pick_date = %s", (MODE, day(1)))
    db_conn.commit()

    assert daily(client).status_code == 200

    with db_conn.cursor() as cur:
        cur.execute("SELECT game_date FROM inkit_drafts WHERE user_id = %s ORDER BY game_date", (game["user_id"],))
        kept = [row["game_date"].isoformat() for row in cur.fetchall()]
    # The old calendar day played today survives (the cleanup goes by updated_at), and so does the
    # stale unfinished one; the stale won day and the stale day without a game are deleted.
    assert kept == [day(-5), day(-4), day(-1), day(0)]


def test_seeding_gives_every_blurry_photo_one_opaque_path(db_conn, make_idol):
    idols = [make_idol(f"Seeded {index}") for index in range(3)]
    with db_conn.cursor() as cur:
        for idol_id in idols:
            cur.execute(
                "INSERT INTO blurry_mode_data (idol_id, blur_image_path, is_active) VALUES (%s, %s, TRUE)",
                (idol_id, f"/images/blurry_idols/seeded_{idol_id}_b.webp"),
            )
        cur.execute(SEED_PHOTOS_FROM_BLURRY_SQL)
        cur.execute("SELECT idol_id, image_path FROM inkit_mode_data ORDER BY idol_id")
        first = cur.fetchall()
        cur.execute(SEED_PHOTOS_FROM_BLURRY_SQL)
        cur.execute("SELECT idol_id, image_path FROM inkit_mode_data ORDER BY idol_id")
        second = cur.fetchall()
    db_conn.commit()

    assert [row["idol_id"] for row in first] == idols and first == second
    assert len({row["image_path"] for row in first}) == 3
    for row in first:
        assert row["image_path"].startswith("/images/inkit/") and "seeded" not in row["image_path"]


def test_migrations_created_the_inkit_tables(db_conn):
    with db_conn.cursor() as cur:
        cur.execute("SELECT migration_filename FROM schema_migrations WHERE migration_filename LIKE '03%%'")
        applied = {row["migration_filename"] for row in cur.fetchall()}
        cur.execute("SELECT attstorage FROM pg_attribute WHERE attrelid = 'inkit_drafts'::regclass AND attname = 'masks'")
        storage = cur.fetchone()["attstorage"]

    assert {"035_add_inkit_mode.sql", "036_add_inkit_drafts.sql"} <= applied
    assert storage in ("e", b"e")


def test_drawings_go_with_a_deleted_user(client, db_conn, game):
    guess(client, game["token"], game["wrong"][0], draft=draft(1))
    with db_conn.cursor() as cur:
        cur.execute("DELETE FROM daily_user_history WHERE user_id = %s", (game["user_id"],))
        cur.execute("DELETE FROM users WHERE id = %s", (game["user_id"],))
        cur.execute("SELECT COUNT(*) AS n FROM inkit_drafts")
        assert cur.fetchone()["n"] == 0
    db_conn.commit()


# --- The rest of the app -------------------------------------------------------


def test_stats_ranking_and_winner_count(client, game, make_user):
    guess(client, game["token"], game["wrong"][0])
    guess(client, game["token"], game["answer"])
    _, second = make_user()
    guess(client, second, game["answer"])

    stats = client.get("/api/stats?gamemode_id=4", headers={"X-User-Token": game["token"]}).get_json()
    assert stats["wins_count"] == 1 and stats["current_streak"] == 1

    assert client.get("/api/daily-users-count?gamemode_id=4").get_json() == {"user_count": 2}
    rank = client.get("/api/daily-rank?gamemode_id=4", headers={"X-User-Token": game["token"]}).get_json()
    assert rank["position"] == 1 and rank["rank"] == 2 and rank["score"] == pytest.approx(9.05)

    # Other modes are untouched.
    assert client.get("/api/daily-users-count?gamemode_id=2").get_json() == {"user_count": 0}


def test_win_grants_the_album_card(client, db_conn, make_user, collection_page, pin, monkeypatch):
    page = collection_page("Ink Group", n_members=1)
    idol_id = page["idol_ids"][0]
    with db_conn.cursor() as cur:
        cur.execute("INSERT INTO inkit_mode_data (idol_id, image_path) VALUES (%s, '/images/inkit/card.webp')", (idol_id,))
    db_conn.commit()
    pin(idol_id)
    _, token = make_user()

    granted = guess(client, token, idol_id).get_json()["card_granted"]
    assert granted["card_id"] == page["card_ids"][0] and granted["is_new"] is True


def test_restore_session_and_game_state_carry_the_inkit_game(client, game):
    guess(client, game["token"], game["wrong"][0], draft=draft(4))

    restored = client.get("/api/game/restore-session", headers={"Authorization": game["token"]}).get_json()
    assert restored["inkit"]["draft"] == draft(4) and restored["inkit"]["answer"] is None
    assert names_nothing(restored, game["answer"])

    state = client.get("/api/game-state?gamemode_id=4", headers={"X-User-Token": game["token"]}).get_json()
    assert state["guessed_idols"] == ["Wrong 0"] and names_nothing(state, game["answer"])


def test_yesterdays_idol(client, db_conn, game, pin):
    pin(game["wrong"][0], offset=-1)
    body = client.get("/api/store-yesterdays-idol?gamemode_id=4", headers={"Authorization": game["token"]}).get_json()
    # With the calendar on, yesterday's answer is only for players who finished that day.
    assert body["locked"] is True and "artist_name" not in body


def test_calendar_day_is_played_with_its_own_drawing(client, db_conn, game, pin):
    past_answer = game["wrong"][9]
    pin(past_answer, offset=-2)
    headers = {"Authorization": game["token"]}

    puzzle = client.get(f"/api/calendar/inkit/{day(-2)}", headers=headers).get_json()
    assert puzzle["puzzle"] == {"image_path": f"/images/inkit/{past_answer:032x}.webp", "image_version": "1"}
    assert puzzle["answer"] is None and puzzle["game"] is None and puzzle["day_number"] == 1
    assert "Wrong 9" not in json.dumps(puzzle)

    wrong = client.post(f"/api/calendar/inkit/{day(-2)}/guess", headers=headers,
                        json={"guessed_idol_id": game["wrong"][0], "draft": draft(6)}).get_json()
    assert wrong["guess_correct"] is False and wrong["answer"] is None
    assert bytes(draft_row(db_conn, game["user_id"], day(-2))["masks"]) == base64.b64decode(draft(6))
    assert draft_row(db_conn, game["user_id"]) is None

    in_progress = client.get(f"/api/calendar/inkit/{day(-2)}", headers=headers).get_json()
    assert in_progress["game"]["draft"] == draft(6) and in_progress["answer"] is None

    won = client.post(f"/api/calendar/inkit/{day(-2)}/guess", headers=headers,
                      json={"guessed_idol_id": past_answer, "draft": draft(7)}).get_json()
    assert won["guess_correct"] is True and won["answer"]["artist_name"] == "Wrong 9"
    assert history_row(db_conn, game["user_id"], day(-2))["is_calendar"] is True

    finished = client.post(f"/api/calendar/inkit/{day(-2)}/guess", headers=headers,
                           json={"guessed_idol_id": game["wrong"][1]})
    assert finished.status_code == 409

    bad = client.post(f"/api/calendar/inkit/{day(-2)}/guess", headers={"Authorization": game["token"]},
                      json={"guessed_idol_id": game["wrong"][1], "draft": "bad"})
    assert bad.status_code in (400, 409)


def test_calendar_rejects_a_bad_drawing(client, db_conn, game, pin):
    pin(game["wrong"][9], offset=-2)
    res = client.post(f"/api/calendar/inkit/{day(-2)}/guess", headers={"Authorization": game["token"]},
                      json={"guessed_idol_id": game["wrong"][0], "draft": draft(version=9)})
    assert res.status_code == 400 and res.get_json() == {"error": "Invalid drawing"}
    assert history_row(db_conn, game["user_id"], day(-2)) is None


def test_ink_hint_on_a_calendar_day(client, game, pin):
    pin(game["wrong"][9], offset=-2)
    headers = {"Authorization": game["token"]}
    for wrong in game["wrong"][:4]:
        client.post(f"/api/calendar/inkit/{day(-2)}/guess", headers=headers, json={"guessed_idol_id": wrong})

    assert hint(client, game["token"], day(-2)).get_json()["hint_ink_guess"] == 5
    assert hint(client, game["token"], day(1)).status_code == 400
    assert hint(client, game["token"], "nonsense").status_code == 400
    assert hint(client, game["token"]).status_code == 400


def test_timeline_and_calendar_hide_unfinished_answers(client, game, pin):
    pin(game["wrong"][9], offset=-1)
    timeline = client.get("/api/calendar/timeline", headers={"Authorization": game["token"]}).get_json()

    assert [entry["date"] for entry in timeline["inkit"]] == [day(-1), day(0)]
    assert all(entry["answer_name"] is None and entry["image_path"] is None for entry in timeline["inkit"])


def test_profile_stats_and_heatmap_count_inkit(client, db_conn, game):
    res = client.post("/api/auth/register", json={"username": "inkfan", "password": "password123"})
    account = res.get_json()
    headers = {"Authorization": f"Bearer {account['access_token']}"}
    guess_res = client.post(
        "/api/game/inkit/guess",
        json={"guessed_idol_id": game["wrong"][0], "game_date": dates.get_today_date_str()}, headers=headers,
    )
    assert guess_res.status_code == 200
    client.post("/api/game/inkit/guess",
                json={"guessed_idol_id": game["answer"], "game_date": dates.get_today_date_str()}, headers=headers)

    stats = client.get("/api/profile/inkfan/stats", headers=headers).get_json()
    assert stats["inkit"]["wins"] == 1 and stats["all"]["wins"] == 1
    assert [idol["artist_name"] for idol in stats["inkit"]["most_guessed"]] == [SECRET_NAME, "Wrong 0"]

    profile = client.get("/api/profile/inkfan", headers=headers).get_json()
    assert profile["activity"][-1] == {"date": dates.get_today_date_str(), "modes": 1}

    history = client.get("/api/profile/inkfan/history?mode=inkit", headers=headers).get_json()
    assert history["entries"][0]["gamemode_id"] == MODE and history["entries"][0]["answer"]["name"] == SECRET_NAME

    visitor = client.get("/api/profile/inkfan/history?mode=inkit").get_json()
    assert visitor["entries"][0] == {"date": dates.get_today_date_str(), "gamemode_id": MODE, "day_number": 1, "locked": True}


def test_idol_page_and_search_list(client, game):
    profile = client.get(f"/api/idols-page/{game['answer']}").get_json()
    assert profile["game_info"]["game_modes_available"]["InkIt"] is True

    # The search list must never map an opaque InkIt path to an idol, only say who InkIt can draw.
    listing = client.get("/api/idols-list")
    assert "/images/inkit/" not in listing.get_data(as_text=True)
    flags = {idol["id"]: idol["has_inkit_photo"] for idol in listing.get_json()}
    assert flags[game["answer"]] is True and all(flags[idol] for idol in game["wrong"])


def test_search_list_leaves_out_idols_without_an_inkit_photo(client, make_idol, monkeypatch):
    no_photo = make_idol("No InkIt Photo")
    assert next(i for i in client.get("/api/idols-list").get_json() if i["id"] == no_photo)["has_inkit_photo"] is False

    monkeypatch.setattr("services.inkit_mode.INKIT_ENABLED", False)
    assert "has_inkit_photo" not in client.get("/api/idols-list").get_json()[0]


def test_seed_csv_header_matches_the_table():
    import csv
    from pathlib import Path

    with open(Path(__file__).parents[1] / "data/inkit_idols.csv", encoding="utf-8") as file:
        assert next(csv.reader(file)) == ["idol_id", "image_file", "is_active", "image_version"]


def test_gamemodes_count_follows_the_flag(client, monkeypatch):
    assert client.get("/api/gamemodes-count").get_json() == {"gamemodes_count": 4}
    monkeypatch.setattr("services.inkit_mode.INKIT_ENABLED", False)
    assert client.get("/api/gamemodes-count").get_json() == {"gamemodes_count": 3}


class _Upstream:
    """Stands in for the public bucket's response."""

    headers = type("Headers", (), {"get_content_type": staticmethod(lambda: "image/webp")})()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def read(self):
        return b"webp-bytes"


def test_dev_photo_streams_the_bytes_without_naming_the_file(client, db_conn, game, monkeypatch):
    from routes.games import inkit as inkit_routes

    with db_conn.cursor() as cur:
        cur.execute("INSERT INTO blurry_mode_data (idol_id, blur_image_path, is_active) VALUES (%s, '/b/a_b.webp', TRUE)",
                    (game["answer"],))
    db_conn.commit()
    fetched = []
    monkeypatch.setattr(inkit_routes, "R2_PUBLIC_URL", "https://bucket.test")
    monkeypatch.setattr(inkit_routes.urllib.request, "urlopen", lambda request, timeout: fetched.append(request) or _Upstream())

    res = client.get(f"/api/game/inkit/dev/photo?path=/images/inkit/{game['answer']:032x}.webp")
    assert (res.status_code, res.mimetype, res.data) == (200, "image/webp", b"webp-bytes")
    assert "a_b" not in res.get_data(as_text=True) and [r.full_url for r in fetched] == ["https://bucket.test/b/a_b.webp?v=1"]
    # Not urllib's default User-Agent, which Cloudflare refuses.
    assert fetched[0].get_header("User-agent") == "kpopit-dev-photo/1.0"
    assert client.get("/api/game/inkit/dev/photo?path=/images/inkit/unknown.webp").status_code == 404


def test_dev_photo_needs_the_bucket_url(client, monkeypatch):
    from routes.games import inkit as inkit_routes

    monkeypatch.setattr(inkit_routes, "R2_PUBLIC_URL", "")
    assert client.get("/api/game/inkit/dev/photo?path=x").status_code == 503


def _run_app(script: str, **env) -> subprocess.CompletedProcess:
    """Blueprints register at import, so a fresh interpreter checks another environment."""
    return subprocess.run([sys.executable, "-c", script], env={**os.environ, **env}, capture_output=True, text=True,
                          timeout=60, cwd=os.path.dirname(os.path.dirname(__file__)))


def test_inkit_is_absent_when_the_flag_is_off():
    script = (
        "import app, json; c = app.app.test_client(); "
        "print(c.get('/api/game/inkit/daily').status_code, "
        "c.post('/api/game/inkit/guess', json={}).status_code, "
        "c.post('/api/game/inkit/hint', json={}).status_code, "
        "c.get('/api/calendar/inkit/2026-01-01', headers={'Authorization': '00000000-0000-4000-8000-000000000000'}).status_code, "
        "c.get('/api/game/inkit/dev/photo').status_code, "
        "json.dumps(c.get('/api/features').get_json()['inkit']), "
        "c.get('/api/gamemodes-count').get_json()['gamemodes_count'])"
    )
    result = _run_app(script, INKIT_ENABLED="false")
    assert result.stdout.split()[-7:] == ["404", "404", "404", "404", "404", "false", "3"], result.stderr[-2000:]


def test_dev_photo_is_absent_in_production():
    script = ("import app; c = app.app.test_client(); "
              "print(c.get('/api/game/inkit/dev/photo?path=x').status_code, c.get('/api/game/inkit/daily').status_code)")
    result = _run_app(script, FLASK_ENV="production", INKIT_ENABLED="true", FRONTEND_URL="http://localhost:5173",
                      PYTHON_DOTENV_DISABLED="", FLASK_SKIP_DOTENV="")
    # Startup refuses a local test DB outside the isolated runners, or serves no dev route at all.
    assert result.returncode != 0 or result.stdout.split()[-2] == "404", result.stderr[-2000:]


# --- Many days ---------------------------------------------------------------


def test_thirty_days_of_play(client, db_conn, inkit_idol, make_user, monkeypatch):
    """A month of daily games: one pick a day, a 10-day cooldown, a fresh sheet every day and the
    answer never sent before the win."""
    idols = {inkit_idol(f"Daily Idol {index}"): f"Daily Idol {index}" for index in range(15)}
    by_path = {f"/images/inkit/{idol_id:032x}.webp": idol_id for idol_id in idols}
    user_id, token = make_user()
    answers = []

    for offset in range(30):
        monkeypatch.setattr(dates, "TEST_MODE", True)
        monkeypatch.setattr(dates, "TEST_DATE_OFFSET", offset)

        payload = daily(client, token).get_json()
        answer = by_path[payload["image_path"]]
        assert payload["day_number"] == offset + 1 and payload["game"] is None
        assert idols[answer] not in json.dumps(payload)
        assert answer not in answers[-10:]
        answers.append(answer)

        wrong = next(idol_id for idol_id in idols if idol_id != answer)
        missed = guess(client, token, wrong, draft=draft(offset % 16)).get_json()
        assert missed["guess_correct"] is False and idols[answer] not in json.dumps(missed)

        if offset % 3 == 2:
            continue
        won = guess(client, token, answer, draft=draft(offset % 16)).get_json()
        assert won["guess_correct"] is True and won["answer"]["artist_name"] == idols[answer]

    with db_conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS n FROM daily_picks WHERE gamemode_id = %s", (MODE,))
        assert cur.fetchone()["n"] == 31
        cur.execute("SELECT wins_count, current_streak, max_streak FROM user_history WHERE user_id = %s AND gamemode_id = %s",
                    (user_id, MODE))
        totals = cur.fetchone()
    assert totals["wins_count"] == 20 and totals["max_streak"] == 2

    timeline = client.get("/api/calendar/timeline", headers={"Authorization": token}).get_json()["inkit"]
    assert len(timeline) == 30
    for entry in timeline:
        assert (entry["answer_name"] is None) == (entry["status"] != "won_live")


def test_backend_rules_match_the_frontend_config():
    """The server enforces the same rounds and drawing format the game is built on (INKIT_CONFIG)."""
    import re
    from pathlib import Path

    from services import inkit_mode

    config = (Path(__file__).parents[2] / "kpopit-frontend/src/features/inkit/config.ts").read_text(encoding="utf-8")

    def number(pattern):
        return float(re.search(pattern, config).group(1))

    assert number(r"hint1: \{ fromRound: (\d+)") == inkit_mode.INK_HINT_ROUND
    assert number(r"hint2: \{ fromRound: (\d+)") == inkit_mode.GROUP_HINT_ROUND
    assert number(r"version: (\d+)") == inkit_mode.DRAFT_VERSION
    assert number(r"export const SHEET = (\d+)") / 2 == inkit_mode.DRAFT_MASK_SIDE
    assert inkit_mode.DRAFT_RAW_LENGTH == 93_751


# --- B2: hashed paths in the seed and migration ----------------------------


def _seed_inkit_csv(tmp_path, idol_id, image_file="seeun_i.webp"):
    csv_path = tmp_path / "inkit.csv"
    csv_path.write_text(
        f"idol_id,image_file,is_active,image_version\n{idol_id},{image_file},true,1\n",
        encoding="utf-8",
    )
    return str(csv_path)


def test_seed_hashes_readable_inkit_files(db_conn, make_idol, tmp_path):
    import seed_db
    from utils.inkit_paths import opaque_path

    idol = make_idol("Seed Idol")
    with db_conn.cursor() as cur:
        seed_db.seed_inkit_photos(cur, _seed_inkit_csv(tmp_path, idol))
    db_conn.commit()

    with db_conn.cursor() as cur:
        cur.execute("SELECT image_file, image_path, pencil_path, pen_path FROM inkit_mode_data WHERE idol_id = %s", (idol,))
        row = cur.fetchone()

    secret = os.environ["INKIT_PATH_SECRET"]
    assert row["image_file"] == "seeun_i.webp"
    assert row["image_path"] == opaque_path("seeun_i", "photo", secret)
    assert row["pencil_path"] == opaque_path("seeun_i", "pencil", secret)
    assert row["pen_path"] == opaque_path("seeun_i", "pen", secret)


def test_no_readable_file_in_any_path_column(db_conn, make_idol, tmp_path):
    import seed_db

    idol = make_idol("Readable Idol")
    with db_conn.cursor() as cur:
        seed_db.seed_inkit_photos(cur, _seed_inkit_csv(tmp_path, idol))
    db_conn.commit()

    with db_conn.cursor() as cur:
        cur.execute("SELECT image_path, pencil_path, pen_path FROM inkit_mode_data WHERE idol_id = %s", (idol,))
        row = cur.fetchone()
    for column in ("image_path", "pencil_path", "pen_path"):
        assert "seeun" not in row[column]


def test_seed_refuses_without_secret(db_conn, make_idol, tmp_path, monkeypatch):
    import seed_db

    idol = make_idol("No Secret Idol")
    csv_path = _seed_inkit_csv(tmp_path, idol)
    monkeypatch.setenv("INKIT_PATH_SECRET", "")
    with db_conn.cursor() as cur:
        with pytest.raises(RuntimeError):
            seed_db.seed_inkit_photos(cur, csv_path)
    db_conn.rollback()

    with db_conn.cursor() as cur:
        cur.execute("SELECT 1 FROM inkit_mode_data WHERE idol_id = %s", (idol,))
        assert cur.fetchone() is None


def test_placeholders_get_three_opaque_paths(db_conn, make_idol, tmp_path):
    import seed_db

    idol = make_idol("Placeholder Idol")
    with db_conn.cursor() as cur:
        cur.execute("INSERT INTO blurry_mode_data (idol_id, blur_image_path, is_active) VALUES (%s, '/b/x.webp', TRUE)", (idol,))
    db_conn.commit()

    empty = tmp_path / "empty.csv"
    empty.write_text("idol_id,image_file,is_active,image_version\n", encoding="utf-8")
    with db_conn.cursor() as cur:
        seed_db.seed_inkit_photos(cur, str(empty))
    db_conn.commit()

    with db_conn.cursor() as cur:
        cur.execute("SELECT image_path, pencil_path, pen_path FROM inkit_mode_data WHERE idol_id = %s", (idol,))
        row = cur.fetchone()
    assert re.fullmatch(r"/images/inkit/[0-9a-f]{32}\.webp", row["image_path"])
    assert re.fullmatch(r"/images/inkit/pencil/[0-9a-f]{32}\.webp", row["pencil_path"])
    assert re.fullmatch(r"/images/inkit/pen/[0-9a-f]{32}\.webp", row["pen_path"])


def test_api_never_returns_image_file(client, db_conn, game, pin):
    """A readable image_file on every InkIt row must never surface in any response."""
    with db_conn.cursor() as cur:
        cur.execute("UPDATE inkit_mode_data SET image_file = 'readable_' || idol_id || '.webp'")
    db_conn.commit()
    pin(game["wrong"][9], offset=-2)
    headers = {"Authorization": game["token"]}

    responses = [
        daily(client).get_json(),
        guess(client, game["token"], game["wrong"][0]).get_json(),
        daily(client, game["token"]).get_json(),
        client.get("/api/game/restore-session", headers=headers).get_json(),
        client.get("/api/game-state?gamemode_id=4", headers={"X-User-Token": game["token"]}).get_json(),
        client.get(f"/api/calendar/inkit/{day(-2)}", headers=headers).get_json(),
        client.post(f"/api/calendar/inkit/{day(-2)}/guess", headers=headers,
                    json={"guessed_idol_id": game["wrong"][1]}).get_json(),
    ]
    for body in responses:
        text = json.dumps(body)
        assert "image_file" not in text and "readable_" not in text


def test_migration_035_is_rerunnable(db_conn):
    from pathlib import Path
    from typing import LiteralString, cast

    import psycopg

    # The migration file is trusted repo SQL, run as is (like migrations.py does).
    sql = cast(LiteralString, (Path(__file__).parents[1] / "migrations/035_add_inkit_mode.sql").read_text(encoding="utf-8"))

    def count(conn, query: LiteralString) -> int:
        row = conn.execute(query).fetchone()
        assert row is not None
        return row[0]

    with psycopg.connect(os.environ["DB_URL"], autocommit=True) as conn:
        conn.execute(sql)
        rows_first = count(conn, "SELECT COUNT(*) FROM inkit_mode_data")
        conn.execute(sql)
        assert count(conn, "SELECT COUNT(*) FROM gamemodes WHERE id = 4") == 1
        assert count(conn, "SELECT COUNT(*) FROM inkit_mode_data") == rows_first


# --- B4: draw-time check on the three stored paths -------------------------


def _draw_inkit(db_conn, pick_date, seed):
    import random
    from datetime import date

    from services.daily_draw import ensure_pick

    with db_conn.cursor() as cur:
        chosen = ensure_pick(cur, MODE, date.fromisoformat(pick_date), random.Random(seed))
    db_conn.rollback()
    return chosen


def test_draw_skips_idol_without_files(db_conn, inkit_idol, monkeypatch):
    good, missing = inkit_idol("Has Files"), inkit_idol("Missing Pen")
    monkeypatch.setattr("services.inkit_assets.files_present", lambda paths: pen_path(missing) not in paths)

    for seed in range(10):
        assert _draw_inkit(db_conn, day(30 + seed), seed) == good


def test_draw_skips_idol_with_null_layer_path(db_conn, inkit_idol, monkeypatch):
    good, missing = inkit_idol("Has Files"), inkit_idol("Null Pen")
    with db_conn.cursor() as cur:
        cur.execute("UPDATE inkit_mode_data SET pen_path = NULL WHERE idol_id = %s", (missing,))
    db_conn.commit()
    monkeypatch.setattr("services.inkit_assets.files_present", lambda paths: True)

    for seed in range(10):
        assert _draw_inkit(db_conn, day(30 + seed), seed) == good


def test_draw_returns_none_when_every_idol_lacks_files(db_conn, inkit_idol, monkeypatch):
    inkit_idol("Missing One")
    inkit_idol("Missing Two")
    monkeypatch.setattr("services.inkit_assets.files_present", lambda paths: False)

    assert _draw_inkit(db_conn, day(30), 0) is None


def test_draw_log_never_names_the_idol(db_conn, inkit_idol, monkeypatch, caplog):
    inkit_idol("Has Files")
    missing = inkit_idol("Missing Pen Idol")
    monkeypatch.setattr("services.inkit_assets.files_present", lambda paths: pen_path(missing) not in paths)

    with caplog.at_level("DEBUG"):
        for seed in range(10):
            _draw_inkit(db_conn, day(30 + seed), seed)

    draw_records = [r for r in caplog.records if r.name in ("services.daily_draw", "services.inkit_assets")]
    assert draw_records, "a skip must be logged"
    for record in draw_records:
        assert record.msg == "Skipped %d InkIt idols without files" and record.args == (1,)
        assert "Missing Pen Idol" not in record.getMessage()


class _Head:
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def test_files_present_checks_three_distinct_paths(monkeypatch):
    from services import inkit_assets

    seen = []

    def fake_urlopen(request, timeout):
        seen.append((request.full_url, request.get_method(), request.get_header("User-agent"), timeout))
        return _Head()

    monkeypatch.setenv("R2_PUBLIC_URL", "https://cdn.test/")
    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    paths = ["/images/inkit/a.webp", "/images/inkit/pencil/b.webp", "/images/inkit/pen/c.webp"]

    assert inkit_assets.files_present(paths) is True
    assert seen == [(f"https://cdn.test{path}", "HEAD", "kpopit-inkit-check/1.0", 3) for path in paths]


def test_files_present_fails_open_on_network_error(monkeypatch, caplog):
    import urllib.error

    from services import inkit_assets

    def down(request, timeout):
        raise urllib.error.URLError("dns")

    monkeypatch.setenv("R2_PUBLIC_URL", "https://cdn.test")
    monkeypatch.setattr("urllib.request.urlopen", down)
    with caplog.at_level("WARNING"):
        assert inkit_assets.files_present(["/images/inkit/a.webp"]) is True
    assert any("InkIt file check unavailable" in r.getMessage() for r in caplog.records)
    assert all("a.webp" not in r.getMessage() for r in caplog.records)


def test_files_present_false_on_404(monkeypatch):
    import urllib.error

    from services import inkit_assets

    def missing(request, timeout):
        raise urllib.error.HTTPError(request.full_url, 404, "Not Found", {}, None)

    monkeypatch.setenv("R2_PUBLIC_URL", "https://cdn.test")
    monkeypatch.setattr("urllib.request.urlopen", missing)
    assert inkit_assets.files_present(["/images/inkit/a.webp", "/images/inkit/pen/c.webp"]) is False


def test_files_present_skipped_without_bucket_url(monkeypatch):
    from services import inkit_assets

    def never(request, timeout):
        raise AssertionError("no request without a bucket URL")

    monkeypatch.setenv("R2_PUBLIC_URL", "")
    monkeypatch.setattr("urllib.request.urlopen", never)
    assert inkit_assets.files_present(["/images/inkit/a.webp"]) is True
