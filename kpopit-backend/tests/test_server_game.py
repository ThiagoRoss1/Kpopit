"""T40: the server owns the answer and the attempt count. guessed_ids records each id once, in
order; the body's answer_id / current_attempt are ignored; restore-session rebuilds the day for a
logged-in or an anonymous caller, scoped to that caller."""

import json
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest

from utils import dates


@pytest.fixture
def idol(db_conn, make_idol):
    def _make(name):
        idol_id = make_idol(name)
        with db_conn.cursor() as cur:
            cur.execute("UPDATE idols SET position = 'Vocalist' WHERE id = %s", (idol_id,))
        db_conn.commit()
        return idol_id

    return _make


@pytest.fixture
def pin(db_conn):
    def _pin(idol_id, gamemode_id=1):
        with db_conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO daily_picks (pick_date, idol_id, gamemode_id) VALUES (%s, %s, %s)
                ON CONFLICT (pick_date, gamemode_id) DO UPDATE SET idol_id = EXCLUDED.idol_id
                """,
                (dates.get_today_date(), idol_id, gamemode_id),
            )
            if gamemode_id == 2:
                cur.execute(
                    "INSERT INTO blurry_mode_data (idol_id, blur_image_path, is_active) VALUES (%s, '/b.webp', TRUE) "
                    "ON CONFLICT DO NOTHING",
                    (idol_id,),
                )
        db_conn.commit()

    return _pin


def classic_guess(client, token, guessed, **body):
    return client.post(
        "/api/game/classic/guess?gamemode_id=1",
        json={"guessed_idol_id": guessed, "game_date": dates.get_today_date_str(), **body},
        headers={"Authorization": token},
    )


def day_row(db_conn, user_id, gamemode_id=1):
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT guessed_ids, guesses_origin, guesses_count, won, one_shot_win, score, game_state "
            "FROM daily_user_history WHERE user_id = %s AND date = %s AND gamemode_id = %s",
            (user_id, dates.get_today_date_str(), gamemode_id),
        )
        return cur.fetchone()


def test_guesses_are_recorded_in_order_with_live_origin(client, db_conn, make_user, idol, pin):
    user_id, token = make_user()
    answer, a, b = idol("Answer"), idol("A"), idol("B")
    pin(answer)
    for guessed in (b, a, answer):
        assert classic_guess(client, token, guessed).status_code == 200
    row = day_row(db_conn, user_id)
    assert row["guessed_ids"] == [b, a, answer]
    assert (row["guesses_origin"], row["guesses_count"], row["won"]) == ("live", 3, True)


def test_retry_of_the_same_guess_counts_once(client, db_conn, make_user, idol, pin):
    user_id, token = make_user()
    answer, wrong = idol("Answer"), idol("Wrong")
    pin(answer)
    first = classic_guess(client, token, wrong).get_json()
    retry = classic_guess(client, token, wrong).get_json()
    assert first == retry
    row = day_row(db_conn, user_id)
    assert (row["guessed_ids"], row["guesses_count"]) == ([wrong], 1)


def test_repeated_idol_later_in_the_game_counts_once(client, db_conn, make_user, idol, pin):
    user_id, token = make_user()
    answer, a, b = idol("Answer"), idol("A"), idol("B")
    pin(answer)
    for guessed in (a, b, a, answer):
        classic_guess(client, token, guessed)
    row = day_row(db_conn, user_id)
    assert row["guessed_ids"] == [a, b, answer]
    assert row["guesses_count"] == 3
    assert float(row["score"]) == pytest.approx(10 * round(2.718281828 ** -0.2, 3), abs=0.01)


def test_body_answer_id_and_current_attempt_are_ignored(client, db_conn, make_user, idol, pin):
    user_id, token = make_user()
    answer, a, b = idol("Answer"), idol("A"), idol("B")
    pin(answer)
    # Claiming the guessed idol is the answer does not make it correct.
    fake = classic_guess(client, token, a, answer_id=a, current_attempt=1).get_json()
    assert fake["guess_correct"] is False
    classic_guess(client, token, b, answer_id=b, current_attempt=1)
    win = classic_guess(client, token, answer, answer_id=a, current_attempt=1).get_json()
    assert win["guess_correct"] is True
    row = day_row(db_conn, user_id)
    assert (row["guesses_count"], row["one_shot_win"]) == (3, False)
    with db_conn.cursor() as cur:
        cur.execute("SELECT average_guesses, one_shot_wins FROM user_history WHERE user_id = %s", (user_id,))
        stats = cur.fetchone()
    assert (float(stats["average_guesses"]), stats["one_shot_wins"]) == (3.0, 0)


def test_one_shot_only_with_exactly_one_guess(client, db_conn, make_user, idol, pin):
    one_id, one_token = make_user()
    two_id, two_token = make_user()
    answer, wrong = idol("Answer"), idol("Wrong")
    pin(answer)
    classic_guess(client, one_token, answer)
    classic_guess(client, two_token, wrong)
    classic_guess(client, two_token, answer)
    assert day_row(db_conn, one_id)["one_shot_win"] is True
    assert day_row(db_conn, two_id)["one_shot_win"] is False


def test_guess_after_the_win_is_not_recorded(client, db_conn, make_user, idol, pin):
    user_id, token = make_user()
    answer, late = idol("Answer"), idol("Late")
    pin(answer)
    classic_guess(client, token, answer)
    assert classic_guess(client, token, late).get_json()["guess_correct"] is False
    assert day_row(db_conn, user_id)["guessed_ids"] == [answer]


def test_concurrent_guesses_neither_skip_nor_duplicate(app, db_conn, make_user, idol, pin):
    user_id, token = make_user()
    answer = idol("Answer")
    wrong = [idol(f"W{n}") for n in range(5)]
    pin(answer)

    def send(guessed):
        return classic_guess(app.test_client(), token, guessed).status_code

    with ThreadPoolExecutor(max_workers=5) as pool:
        statuses = list(pool.map(send, wrong + wrong))
    assert set(statuses) == {200}
    row = day_row(db_conn, user_id)
    assert sorted(row["guessed_ids"]) == sorted(wrong)
    assert row["guesses_count"] == len(wrong)


def test_blurry_and_pixelated_count_on_the_server(client, db_conn, make_user, idol, pin, make_group,
                                                   make_album, set_daily_pick, today):
    user_id, token = make_user()
    answer, wrong = idol("Blur Answer"), idol("Blur Wrong")
    pin(answer, gamemode_id=2)
    for guessed in (wrong, wrong, answer):
        client.post(
            "/api/game/blurry/guess?gamemode_id=2",
            json={"guessed_idol_id": guessed, "answer_id": wrong, "current_attempt": 9, "game_date": today},
            headers={"Authorization": token},
        )
    row = day_row(db_conn, user_id, 2)
    assert (row["guessed_ids"], row["guesses_count"], row["won"]) == ([wrong, answer], 2, True)

    gid = make_group("Pixie")
    album, other = make_album("Right", gid), make_album("Other", gid)
    set_daily_pick(album, 3)
    for guessed in (other, album):
        client.post(
            "/api/game/pixelated/guess?gamemode_id=3",
            json={"album_id": guessed, "current_attempt": 7, "game_date": today},
            headers={"Authorization": token},
        )
    row = day_row(db_conn, user_id, 3)
    assert (row["guessed_ids"], row["guesses_count"], row["won"]) == ([other, album], 2, True)


def test_game_state_keeps_screen_state_only(client, db_conn, make_user, idol, pin):
    user_id, token = make_user()
    answer, wrong = idol("Answer"), idol("Wrong")
    pin(answer)
    classic_guess(client, token, wrong)
    client.post(
        "/api/game-state?gamemode_id=1",
        headers={"X-User-Token": token},
        json={"game_state": {"today_guesses_details": [{"forged": True}], "game_won": True,
                             "hints_revealed": {"hint1": True}, "game_date": "x"}},
    )
    assert json.loads(day_row(db_conn, user_id)["game_state"]) == {"hints_revealed": {"hint1": True}, "game_date": "x"}


def test_anonymous_restore_rebuilds_the_day(client, make_user, idol, pin):
    _, token = make_user()
    answer, wrong = idol("Answer"), idol("Wrong")
    pin(answer)
    classic_guess(client, token, wrong)
    classic_guess(client, token, answer)
    client.post("/api/game-state?gamemode_id=1", headers={"X-User-Token": token},
                json={"game_state": {"hints_revealed": {"hint1": True}}})

    res = client.get("/api/game/restore-session", headers={"Authorization": token})
    assert res.status_code == 200
    body = res.get_json()
    classic = body["classic"]
    assert [g["guessed_idol_data"]["idol_id"] for g in classic["today_guesses_details"]] == [wrong, answer]
    assert [g["guess_correct"] for g in classic["today_guesses_details"]] == [False, True]
    assert classic["guessed_idols"] == ["Wrong", "Answer"]
    assert (classic["game_complete"], classic["game_won"]) == (True, True)
    assert classic["hints_revealed"] == {"hint1": True}
    assert classic["today_guesses_details"][0]["feedback"]["artist_name"]["status"] == "incorrect"
    assert body["blurry"] is None and body["pixelated"] is None


def test_restore_is_scoped_to_the_callers_own_day(client, make_user, make_access_jwt, idol, pin):
    owner_id, owner_token = make_user()
    other_id, other_token = make_user()
    answer = idol("Answer")
    pin(answer)
    classic_guess(client, owner_token, answer)

    assert client.get("/api/game/restore-session", headers={"Authorization": other_token}).get_json()["classic"] is None
    jwt = make_access_jwt(other_id, other_token)
    assert client.get("/api/game/restore-session",
                      headers={"Authorization": f"Bearer {jwt}"}).get_json()["classic"] is None
    owner_jwt = make_access_jwt(owner_id, owner_token)
    assert client.get("/api/game/restore-session",
                      headers={"Authorization": f"Bearer {owner_jwt}"}).get_json()["classic"]["game_won"] is True


def test_restore_rejects_missing_and_unknown_tokens(client):
    assert client.get("/api/game/restore-session").status_code == 401
    unknown = client.get("/api/game/restore-session", headers={"Authorization": str(uuid.uuid4())})
    assert (unknown.status_code, unknown.get_json()) == (400, {"error": "Invalid user token"})


def test_game_started_before_the_deploy_keeps_counting(client, db_conn, make_user, idol, pin):
    """A row written before migration 027 has guessed_ids NULL but attempts already counted."""
    user_id, token = make_user()
    answer, wrong = idol("Answer"), idol("Wrong")
    pin(answer)
    with db_conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO daily_user_history (user_id, date, gamemode_id, guesses_count, won, started_at,
                                            guessed_ids, guesses_origin)
            VALUES (%s, %s, 1, 2, FALSE, NOW(), NULL, NULL)
            """,
            (user_id, dates.get_today_date()),
        )
    db_conn.commit()

    assert classic_guess(client, token, wrong).status_code == 200
    row = day_row(db_conn, user_id)
    assert (row["guessed_ids"], row["guesses_count"], row["guesses_origin"]) == ([wrong], 3, "live")

    classic_guess(client, token, wrong)
    assert (day_row(db_conn, user_id)["guesses_count"]) == 3

    assert classic_guess(client, token, answer).get_json()["guess_correct"] is True
    row = day_row(db_conn, user_id)
    assert (row["guessed_ids"], row["guesses_count"], row["won"], row["one_shot_win"]) == ([wrong, answer], 4, True, False)
    assert float(row["score"]) == pytest.approx(10 * round(2.718281828 ** -0.3, 3), abs=0.01)
