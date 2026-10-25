"""T50: the calendar. Any day from a mode's first pick up to today; past days are recorded like live
games and marked is_calendar when finished there; they count in win stats and grant the Album 1
card, never the streak or ranking; the answer stays hidden until the player finishes the day."""

from datetime import timedelta

import pytest

from utils import dates
from utils.dates import get_today_date


def day(offset: int) -> str:
    return (get_today_date() + timedelta(days=offset)).isoformat()


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
def pick(db_conn):
    def _pick(idol_id, offset, gamemode_id=1):
        with db_conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO daily_picks (pick_date, idol_id, gamemode_id) VALUES (%s, %s, %s)
                ON CONFLICT (pick_date, gamemode_id) DO UPDATE SET idol_id = EXCLUDED.idol_id
                """,
                (day(offset), idol_id, gamemode_id),
            )
            if gamemode_id == 2:
                cur.execute("INSERT INTO blurry_mode_data (idol_id, blur_image_path, is_active) "
                            "VALUES (%s, '/b.webp', TRUE) ON CONFLICT DO NOTHING", (idol_id,))
        db_conn.commit()

    return _pick


@pytest.fixture
def week(idol, pick):
    """Classic picks for the last 4 days and today: {offset: idol_id}, plus a wrong idol."""
    picks = {}
    for offset in (-4, -3, -2, -1, 0):
        picks[offset] = idol(f"Answer {offset}")
        pick(picks[offset], offset)
    picks["wrong"] = idol("Wrong")
    return picks


def cal_guess(client, token, offset, guessed, mode="classic"):
    key = "guessed_album_id" if mode == "pixelated" else "guessed_idol_id"
    return client.post(f"/api/calendar/{mode}/{day(offset)}/guess", json={key: guessed},
                       headers={"Authorization": token})


def live_guess(client, token, guessed):
    return client.post("/api/game/classic/guess?gamemode_id=1",
                       json={"guessed_idol_id": guessed, "game_date": dates.get_today_date_str()},
                       headers={"Authorization": token})


def row(db_conn, user_id, offset, gamemode_id=1):
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT guessed_ids, guesses_count, won, is_calendar, won_at FROM daily_user_history "
            "WHERE user_id = %s AND date = %s AND gamemode_id = %s",
            (user_id, day(offset), gamemode_id),
        )
        return cur.fetchone()


def stats(db_conn, user_id, gamemode_id=1):
    with db_conn.cursor() as cur:
        cur.execute("SELECT current_streak, max_streak, wins_count, last_played_date FROM user_history "
                    "WHERE user_id = %s AND gamemode_id = %s", (user_id, gamemode_id))
        return cur.fetchone()


def test_future_and_too_early_days_are_rejected(client, make_user, week):
    _, token = make_user()
    for offset in (1, -5):
        res = client.get(f"/api/calendar/classic/{day(offset)}", headers={"Authorization": token})
        assert (res.status_code, res.get_json()) == (400, {"error": "Invalid challenge date"})
        assert cal_guess(client, token, offset, week["wrong"]).get_json() == {"error": "Invalid challenge date"}
    bad = client.get("/api/calendar/classic/not-a-date", headers={"Authorization": token})
    assert bad.status_code == 400
    assert client.get(f"/api/calendar/darts/{day(-1)}", headers={"Authorization": token}).status_code == 404


def test_past_day_is_played_and_recorded_as_calendar(client, db_conn, make_user, week):
    user_id, token = make_user()
    assert cal_guess(client, token, -2, week["wrong"]).get_json()["guess_correct"] is False
    win = cal_guess(client, token, -2, week[-2]).get_json()
    assert win["guess_correct"] is True
    r = row(db_conn, user_id, -2)
    assert (r["guessed_ids"], r["guesses_count"], r["won"], r["is_calendar"]) == ([week["wrong"], week[-2]], 2, True, True)
    assert r["won_at"] is not None


def test_a_day_finished_live_is_view_only(client, db_conn, make_user, week):
    user_id, token = make_user()
    live_guess(client, token, week[0])
    res = cal_guess(client, token, 0, week["wrong"])
    assert (res.status_code, res.get_json()) == (409, {"error": "This day is already finished"})
    view = client.get(f"/api/calendar/classic/{day(0)}", headers={"Authorization": token}).get_json()
    assert view["status"] == "won_live" and view["answer"]["idol_id"] == week[0]
    assert row(db_conn, user_id, 0)["is_calendar"] is False


def test_started_live_and_finished_in_the_calendar_becomes_calendar(client, db_conn, make_user, week, monkeypatch):
    user_id, token = make_user()
    live_guess(client, token, week["wrong"])  # today, not finished
    monkeypatch.setattr(dates, "TEST_MODE", True)
    monkeypatch.setattr(dates, "TEST_DATE_OFFSET", 1)  # the next day: that game is now in the past
    assert cal_guess(client, token, -1, week[0]).get_json()["guess_correct"] is True
    r = row(db_conn, user_id, -1)
    assert (r["guessed_ids"], r["won"], r["is_calendar"]) == ([week["wrong"], week[0]], True, True)


def test_a_calendar_win_for_yesterday_does_not_extend_todays_streak(client, db_conn, make_user, week, monkeypatch):
    user_id, token = make_user()
    monkeypatch.setattr(dates, "TEST_MODE", True)
    monkeypatch.setattr(dates, "TEST_DATE_OFFSET", -2)  # play day -2 live
    assert live_guess(client, token, week[-2]).get_json()["guess_correct"] is True
    monkeypatch.setattr(dates, "TEST_MODE", False)
    monkeypatch.setattr(dates, "TEST_DATE_OFFSET", 0)

    # Day -1 was missed live and is won through the calendar: the streak doesn't bridge it.
    assert cal_guess(client, token, -1, week[-1]).get_json()["guess_correct"] is True
    s = stats(db_conn, user_id)
    assert (s["current_streak"], s["max_streak"], s["last_played_date"]) == (1, 1, get_today_date() - timedelta(days=2))

    live_guess(client, token, week[0])
    s = stats(db_conn, user_id)
    assert (s["wins_count"], s["current_streak"], s["max_streak"]) == (3, 1, 1)
    assert s["last_played_date"] == get_today_date()


def test_calendar_wins_count_in_stats_but_not_streak_or_ranking(client, db_conn, make_user, week):
    user_id, token = make_user()
    other_id, other_token = make_user()
    for offset in (-4, -3, -2, -1):
        cal_guess(client, token, offset, week[offset])
    s = stats(db_conn, user_id)
    assert (s["wins_count"], s["current_streak"], s["max_streak"], s["last_played_date"]) == (4, 0, 0, None)

    live_guess(client, token, week[0])
    s = stats(db_conn, user_id)
    assert (s["wins_count"], s["current_streak"], s["max_streak"]) == (5, 1, 1)
    assert s["last_played_date"] == get_today_date()

    # Only today's live winners rank.
    assert client.get("/api/daily-users-count?gamemode_id=1").get_json() == {"user_count": 1}
    cal_guess(client, other_token, -1, week[-1])
    assert client.get("/api/daily-users-count?gamemode_id=1").get_json() == {"user_count": 1}
    assert client.get("/api/daily-rank?gamemode_id=1", headers={"X-User-Token": other_token}).get_json()["rank"] is None
    assert stats(db_conn, other_id)["wins_count"] == 1


def test_calendar_win_grants_the_album_card(client, db_conn, make_user, collection_page, pick, monkeypatch):
    monkeypatch.setattr("services.game_service.COLLECTION_ENABLED", True)
    user_id, token = make_user()
    page = collection_page(n_members=2)
    pick(page["idol_ids"][0], -3, gamemode_id=2)
    res = cal_guess(client, token, -3, page["idol_ids"][0], mode="blurry").get_json()
    assert res["guess_correct"] is True and res["card_granted"]["is_new"] is True
    with db_conn.cursor() as cur:
        cur.execute("SELECT card_id FROM user_cards WHERE user_id = %s", (user_id,))
        assert [r["card_id"] for r in cur.fetchall()] == [page["card_ids"][0]]


def test_answer_hidden_until_the_day_is_finished(client, make_user, week):
    _, token = make_user()
    url = f"/api/calendar/classic/{day(-2)}"
    before = client.get(url, headers={"Authorization": token}).get_json()
    assert before["status"] == "not_played" and before["answer"] is None and before["game"] is None
    assert "Answer" not in str(before)  # no name, id or photo of the answer
    assert before["puzzle"]["categories"]
    cal_guess(client, token, -2, week["wrong"])
    mid = client.get(url, headers={"Authorization": token}).get_json()
    assert mid["status"] == "in_progress" and mid["answer"] is None
    assert [g["guessed_idol_data"]["idol_id"] for g in mid["game"]["today_guesses_details"]] == [week["wrong"]]
    cal_guess(client, token, -2, week[-2])
    after = client.get(url, headers={"Authorization": token}).get_json()
    assert after["status"] == "won_calendar" and after["answer"]["idol_id"] == week[-2]


def test_anonymous_players_can_play_and_need_a_token(client, make_user, week):
    _, token = make_user()
    assert cal_guess(client, token, -1, week[-1]).status_code == 200
    assert client.get("/api/calendar/timeline").status_code == 400
    assert client.post(f"/api/calendar/classic/{day(-1)}/guess", json={"guessed_idol_id": week[-1]}).status_code == 400


def test_timeline_statuses(client, make_user, week):
    _, token = make_user()
    live_guess(client, token, week[0])
    cal_guess(client, token, -1, week[-1])
    cal_guess(client, token, -3, week["wrong"])
    timeline = client.get("/api/calendar/timeline", headers={"Authorization": token}).get_json()
    assert [(d["date"], d["status"]) for d in timeline["classic"]] == [
        (day(-4), "not_played"), (day(-3), "in_progress"), (day(-2), "not_played"),
        (day(-1), "won_calendar"), (day(0), "won_live"),
    ]
    assert timeline["pixelated"] == []


def test_pixelated_calendar_day(client, db_conn, make_user, make_group, make_album):
    user_id, token = make_user()
    gid = make_group("Pixie")
    right, wrong = make_album("Right", gid), make_album("Wrong", gid)
    with db_conn.cursor() as cur:
        cur.execute("INSERT INTO daily_picks (pick_date, album_id, gamemode_id) VALUES (%s, %s, 3)", (day(-1), right))
    db_conn.commit()
    view = client.get(f"/api/calendar/pixelated/{day(-1)}", headers={"Authorization": token}).get_json()
    assert view["answer"] is None and view["puzzle"]["cover_path"]
    cal_guess(client, token, -1, wrong, mode="pixelated")
    assert cal_guess(client, token, -1, right, mode="pixelated").get_json()["guess_correct"] is True
    r = row(db_conn, user_id, -1, gamemode_id=3)
    assert (r["guessed_ids"], r["is_calendar"]) == ([wrong, right], True)


def test_yesterdays_answer_only_for_players_who_finished_it(client, make_user, week):
    finisher_id, finisher = make_user()
    _, other = make_user()
    cal_guess(client, finisher, -1, week[-1])
    shown = client.get("/api/store-yesterdays-idol?gamemode_id=1", headers={"Authorization": finisher}).get_json()
    assert shown["past_idol_id"] == week[-1]
    hidden = client.get("/api/store-yesterdays-idol?gamemode_id=1", headers={"Authorization": other}).get_json()
    assert hidden == {"yesterdays_pick_date": day(-1), "locked": True, "play_in_calendar": True}
    assert client.get("/api/store-yesterdays-idol?gamemode_id=1").get_json()["locked"] is True


def test_yesterdays_answer_unchanged_with_the_calendar_off(client, make_user, week, monkeypatch):
    monkeypatch.setattr("routes.game_logic.CALENDAR_ENABLED", False)
    assert client.get("/api/store-yesterdays-idol?gamemode_id=1").get_json()["past_idol_id"] == week[-1]


def test_days_without_a_pick_are_not_challenges(client, db_conn, make_user, week):
    _, token = make_user()
    with db_conn.cursor() as cur:
        cur.execute("DELETE FROM daily_picks WHERE pick_date = %s AND gamemode_id = 1", (day(-2),))
    db_conn.commit()
    timeline = client.get("/api/calendar/timeline", headers={"Authorization": token}).get_json()
    assert day(-2) not in [d["date"] for d in timeline["classic"]]
    assert len(timeline["classic"]) == 4
    gap = client.get(f"/api/calendar/classic/{day(-2)}", headers={"Authorization": token})
    assert (gap.status_code, gap.get_json()) == (400, {"error": "Invalid challenge date"})
    assert cal_guess(client, token, -2, week["wrong"]).get_json() == {"error": "Invalid challenge date"}
