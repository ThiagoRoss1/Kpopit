"""Public profile match history (server-side anti-spoiler) and stats, on fixed fixtures."""

import json
from datetime import datetime, timedelta, timezone

import pytest

from services.profile_stats import streaks
from utils.dates import get_today_date

PASSWORD = "password123"


def register(client, username):
    res = client.post("/api/auth/register", json={"username": username, "password": PASSWORD})
    assert res.status_code == 201, res.get_json()
    body = res.get_json()
    return body["user"]["user_id"], {"Authorization": f"Bearer {body['access_token']}"}


def day(days_ago: int):
    return get_today_date() - timedelta(days=days_ago)


@pytest.fixture
def game(db_conn):
    """Insert a daily_user_history row `days_ago` days back."""

    def _make(user_id, days_ago, *, mode=1, won=True, guesses=3, calendar=False, origin="live",
              seconds=None, guessed_ids=()):
        started = datetime(2026, 1, 1, 12, tzinfo=timezone.utc)
        with db_conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO daily_user_history (user_id, date, gamemode_id, guesses_count, won, one_shot_win,
                                                started_at, won_at, is_calendar, guesses_origin, guessed_ids)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (user_id, day(days_ago), mode, guesses, won, won and guesses == 1,
                 started if seconds is not None else None,
                 started + timedelta(seconds=seconds) if seconds is not None else (started if won else None),
                 calendar, origin, list(guessed_ids)),
            )
        db_conn.commit()

    return _make


@pytest.fixture
def pick(db_conn):
    def _make(days_ago, idol_id, mode=1):
        with db_conn.cursor() as cur:
            cur.execute("INSERT INTO daily_picks (pick_date, idol_id, gamemode_id) VALUES (%s, %s, %s)",
                        (day(days_ago), idol_id, mode))
        db_conn.commit()

    return _make


# --- History (anti-spoiler) ---

@pytest.fixture
def owner_games(client, make_idol, pick, game):
    """`owner` won yesterday's Classic (answer "SecretAnswer") and left the day before unfinished."""
    owner_id, owner_auth = register(client, "owner")
    yesterday_answer, older_answer = make_idol("SecretAnswer"), make_idol("OlderSecret")
    pick(10, make_idol("FirstDay"))
    pick(1, yesterday_answer)
    pick(2, older_answer)
    game(owner_id, 1, guesses=4)
    game(owner_id, 2, won=False, guesses=6)
    return owner_id, owner_auth


def history(client, headers=None, **params):
    return client.get("/api/profile/owner/history", query_string=params, headers=headers or {})


def test_owner_sees_every_game_but_not_answers_they_have_not_found(client, owner_games):
    _, owner_auth = owner_games
    entries = history(client, owner_auth).get_json()["entries"]
    assert entries == [
        {"date": day(1).isoformat(), "gamemode_id": 1, "day_number": 10, "locked": False, "won": True, "guesses": 4,
         "is_calendar": False, "answer": {"name": "SecretAnswer", "image_path": None}},
        {"date": day(2).isoformat(), "gamemode_id": 1, "day_number": 9, "locked": False, "won": False, "guesses": 6,
         "is_calendar": False, "answer": None},
    ]
    assert "OlderSecret" not in json.dumps(entries)


def test_visitor_sees_only_days_they_finished_and_locked_entries_carry_no_answer(client, owner_games, make_user, game):
    visitor_id, token = make_user()
    game(visitor_id, 1, guesses=2)  # finished yesterday's Classic
    game(visitor_id, 2, mode=2)  # another mode on the older day does not unlock it
    res = history(client, {"X-User-Token": token})
    assert res.headers["Cache-Control"] == "no-store"
    unlocked, locked = res.get_json()["entries"]
    assert unlocked["answer"]["name"] == "SecretAnswer"
    assert locked == {"date": day(2).isoformat(), "gamemode_id": 1, "day_number": 9, "locked": True}
    assert "OlderSecret" not in res.get_data(as_text=True)


def test_logged_in_visitor_and_anonymous_visitor_without_a_token(client, owner_games, game):
    visitor_id, visitor_auth = register(client, "visitor")
    game(visitor_id, 2, guesses=1)
    entries = history(client, visitor_auth).get_json()["entries"]
    assert [entry["locked"] for entry in entries] == [True, False]
    anonymous = history(client).get_data(as_text=True)
    assert "SecretAnswer" not in anonymous and "OlderSecret" not in anonymous
    assert all(entry["locked"] for entry in json.loads(anonymous)["entries"])


def test_hidden_match_history_is_owner_only(client, owner_games):
    _, owner_auth = owner_games
    client.patch("/api/user/profile/settings", json={"show_match_history": False}, headers=owner_auth)
    assert history(client).status_code == 403
    assert client.get("/api/profile/owner").get_json()["history_visible"] is False
    assert history(client, owner_auth).status_code == 200


def test_history_filters_by_mode_and_pages(client, owner_games, game, db_conn):
    owner_id, owner_auth = owner_games
    game(owner_id, 3, mode=3)
    assert [e["gamemode_id"] for e in history(client, owner_auth, mode="pixelated").get_json()["entries"]] == [3]
    for n in range(4, 40):
        game(owner_id, n)
    first = history(client, owner_auth).get_json()
    second = history(client, owner_auth, offset=30).get_json()
    assert len(first["entries"]) == 30 and first["has_more"] is True
    assert len(second["entries"]) == 9 and second["has_more"] is False
    assert history(client, owner_auth, mode="ranked").status_code == 400
    assert history(client, owner_auth, offset="-1").status_code == 400


# --- Stats ---

def test_streaks_count_runs_alive_until_a_day_is_missed():
    today = get_today_date()
    assert streaks([today - timedelta(days=n) for n in (1, 2, 4)], today) == (2, 2)
    assert streaks([today - timedelta(days=n) for n in (2, 3, 4)], today) == (0, 3)
    assert streaks([], today) == (0, 0)


@pytest.fixture
def stats_owner(client, game, make_idol, make_group, make_career, make_album):
    owner_id, owner_auth = register(client, "statsy")
    group_a, group_b = make_group("GroupA"), make_group("GroupB")
    a1, a2, b1 = make_idol("Alpha"), make_idol("Amber"), make_idol("Bravo")
    for idol, group in ((a1, group_a), (a2, group_a), (b1, group_b)):
        make_career(idol, group)
    album = make_album("B Album", group_b)
    game(owner_id, 0, guesses=3, seconds=90, guessed_ids=(b1, a2, a1))
    game(owner_id, 1, guesses=1, seconds=30, guessed_ids=(a1,))
    game(owner_id, 2, guesses=5)
    game(owner_id, 3, guesses=9, calendar=True)  # never bridges the streak
    for n in (4, 5, 6):
        game(owner_id, n, guesses=2)
    game(owner_id, 7, won=False, guesses=4)
    game(owner_id, 8, guesses=1, seconds=5, origin="backfill")  # no trustworthy start: not the fastest
    game(owner_id, 1, mode=2, guesses=2, guessed_ids=(a1, b1))
    game(owner_id, 2, mode=3, guesses=1, guessed_ids=(album,))
    game(owner_id, -1, guesses=1)  # a future day (date offset) never counts
    return owner_auth, {"a1": a1, "a2": a2, "b1": b1}


def test_stats_tiles_distribution_and_streaks(client, stats_owner):
    owner_auth, _ = stats_owner
    stats = client.get("/api/profile/statsy/stats", headers=owner_auth).get_json()
    classic = stats["classic"]
    assert {k: classic[k] for k in ("played", "wins", "win_rate", "avg_guesses", "one_shots", "fastest_seconds",
                                    "current_streak", "max_streak")} == {
        "played": 9, "wins": 8, "win_rate": 89, "avg_guesses": 3.1, "one_shots": 2, "fastest_seconds": 30,
        "current_streak": 3, "max_streak": 3}
    assert classic["distribution"] == [2, 3, 1, 0, 1, 0, 0, 1]
    assert (stats["blurry"]["current_streak"], stats["blurry"]["win_rate"]) == (1, 100)
    total = stats["all"]
    assert (total["played"], total["wins"], total["one_shots"]) == (11, 10, 3)
    assert (total["current_streak"], total["current_streak_mode"], total["max_streak"]) == (3, "classic", 3)
    assert total["fastest_seconds"] == 30


def test_win_rate_buckets_cover_16_weeks_and_12_months(client, stats_owner):
    owner_auth, _ = stats_owner
    total = client.get("/api/profile/statsy/stats", headers=owner_auth).get_json()["all"]
    assert len(total["weekly"]) == 16 and len(total["monthly"]) == 12
    assert sum(b["played"] for b in total["weekly"]) == 11
    assert sum(b["wins"] for b in total["monthly"]) == 10
    today = get_today_date()
    assert total["weekly"][-1]["start"] == (today - timedelta(days=today.weekday())).isoformat()
    assert total["monthly"][-1]["start"] == today.replace(day=1).isoformat()


def test_groups_and_most_guessed_idols(client, stats_owner):
    owner_auth, ids = stats_owner
    stats = client.get("/api/profile/statsy/stats", headers=owner_auth).get_json()
    assert stats["classic"]["groups"] == [{"name": "GroupA", "guesses": 3}, {"name": "GroupB", "guesses": 1}]
    assert stats["pixelated"]["groups"] == [{"name": "GroupB", "guesses": 1}]
    assert [(i["idol_id"], i["guesses"], i["group_name"]) for i in stats["all"]["most_guessed"]] == [
        (ids["a1"], 3, "GroupA"), (ids["b1"], 2, "GroupB"), (ids["a2"], 1, "GroupA")]
    assert stats["pixelated"]["most_guessed"] == []


def test_visitors_guess_shares_stop_at_yesterday(client, stats_owner):
    _, ids = stats_owner
    stats = client.get("/api/profile/statsy/stats").get_json()
    assert stats["classic"]["groups"] == [{"name": "GroupA", "guesses": 1}]
    assert [(i["idol_id"], i["guesses"]) for i in stats["classic"]["most_guessed"]] == [(ids["a1"], 1)]
    assert stats["classic"]["played"] == 9  # the tiles still count today's game


def test_others_bucket_after_the_top_five_groups(client, game, make_idol, make_group, make_career):
    owner_id, _ = register(client, "wide")
    guessed = []
    for n in range(7):
        idol = make_idol(f"Idol{n}")
        make_career(idol, make_group(f"Group{n}"))
        guessed.append(idol)
    game(owner_id, 1, guessed_ids=guessed)
    groups = client.get("/api/profile/wide/stats").get_json()["classic"]["groups"]
    assert len(groups) == 6 and groups[-1] == {"name": None, "guesses": 2}
