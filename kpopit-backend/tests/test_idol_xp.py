"""T53: idol XP and the potion, computed from completed games and the selection history."""

from datetime import date, datetime, timedelta, timezone

import pytest

from services import xp_service
from services.xp_service import POTION_CAP, XpService, add_xp, game_xp, level_for

PASSWORD = "password123"
T0 = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)


def at(hours: float) -> datetime:
    return T0 + timedelta(hours=hours)


def register(client, username):
    res = client.post("/api/auth/register", json={"username": username, "password": PASSWORD})
    assert res.status_code == 201, res.get_json()
    body = res.get_json()
    return body["user"]["user_id"], {"Authorization": f"Bearer {body['access_token']}"}


@pytest.fixture
def game(db_conn):
    """Insert a game for a user; each call uses its own day."""
    counter = {"n": 0}

    def _make(user_id, *, won=True, attempts=4, calendar=False, origin="live", hours=0, gamemode_id=1):
        counter["n"] += 1
        with db_conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO daily_user_history (user_id, date, gamemode_id, guesses_count, won, one_shot_win, won_at,
                                                is_calendar, guesses_origin, guessed_ids)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, '{}')
                """,
                (user_id, date(2025, 1, 1) + timedelta(days=counter["n"]), gamemode_id, attempts, won,
                 won and attempts == 1, at(hours) if won else None, calendar, origin),
            )
        db_conn.commit()

    return _make


@pytest.fixture
def selected(db_conn):
    """Record a selection window directly (start/end in hours after T0; end None = current)."""

    def _make(user_id, idol_id, start, end=None):
        with db_conn.cursor() as cur:
            cur.execute("INSERT INTO idol_selections (user_id, idol_id, selected_from, selected_to) VALUES (%s, %s, %s, %s)",
                        (user_id, idol_id, at(start), at(end) if end is not None else None))
        db_conn.commit()

    return _make


def compute(db_conn, user_id):
    with db_conn.cursor() as cur:
        return XpService(db_conn).compute(cur, user_id)


@pytest.mark.parametrize(("attempts", "calendar", "won", "xp"), [
    (4, False, True, 10), (3, False, True, 11), (2, False, True, 11), (1, False, True, 14),
    (1, True, True, 5), (7, True, True, 5), (5, False, False, 0), (1, True, False, 0),
])
def test_xp_per_game_type_and_bonuses(attempts, calendar, won, xp):
    row = {"won": won, "is_calendar": calendar, "one_shot_win": won and attempts == 1, "guesses_count": attempts}
    assert game_xp(row) == xp


def test_levels_follow_3_n_squared():
    assert [level_for(xp) for xp in (0, 2, 3, 11, 12, 299, 300, 10_000)] == [0, 0, 1, 1, 2, 9, 10, 10]


def test_xp_goes_to_the_idol_selected_at_completion(db_conn, make_user, make_idol, game, selected):
    user_id, _ = make_user()
    karina, winter = make_idol("Karina"), make_idol("Winter")
    selected(user_id, karina, 0, 10)
    selected(user_id, winter, 10)
    game(user_id, hours=1)  # Karina: 10
    game(user_id, hours=5, attempts=1)  # Karina: +14
    game(user_id, hours=11)  # Winter: 10
    game(user_id, hours=12, calendar=True)  # Winter: +5
    idol_xp, potion = compute(db_conn, user_id)
    assert idol_xp == {karina: 24, winter: 15}
    assert potion == 0


def test_switching_keeps_xp_with_the_old_idol(client, db_conn, make_idol):
    user_id, auth = register(client, "switcher")
    karina, winter = make_idol("Karina"), make_idol("Winter")
    assert client.post("/api/idol-xp/select", json={"idol_id": karina}, headers=auth).status_code == 200
    with db_conn.cursor() as cur:
        cur.execute("INSERT INTO daily_user_history (user_id, date, gamemode_id, guesses_count, won, won_at) "
                    "VALUES (%s, '2025-06-01', 1, 5, TRUE, NOW())", (user_id,))
    db_conn.commit()
    assert client.post("/api/idol-xp/select", json={"idol_id": winter}, headers=auth).get_json()["idol_id"] == winter
    state = client.get("/api/idol-xp/state", headers=auth).get_json()
    assert state["current"]["idol_id"] == winter
    assert [(i["idol_id"], i["xp"], i["level"]) for i in state["idols"]] == [(karina, 10, 1)]


def test_max_level_receives_40_percent(db_conn, make_user, make_idol, game, selected):
    assert add_xp(295, 10) == pytest.approx(300 + 5 * 0.4)
    assert add_xp(300, 10) == pytest.approx(304)
    user_id, _ = make_user()
    idol = make_idol("Veteran Bias")
    selected(user_id, idol, 0)
    for n in range(31):  # 30 games reach 300, the 31st adds 40% of 10
        game(user_id, hours=n + 1)
    idol_xp, _ = compute(db_conn, user_id)
    assert idol_xp[idol] == pytest.approx(304)
    assert level_for(idol_xp[idol]) == 10


def test_unfinished_games_give_nothing(db_conn, make_user, make_idol, game, selected):
    user_id, _ = make_user()
    idol = make_idol("Bias")
    selected(user_id, idol, 0)
    game(user_id, won=False, hours=1)
    assert compute(db_conn, user_id) == ({}, 0)


def test_backfill_games_fill_the_potion_only(db_conn, make_user, make_idol, game, selected):
    user_id, _ = make_user()
    idol = make_idol("Bias")
    selected(user_id, idol, 0)
    game(user_id, hours=1, origin="backfill")
    game(user_id, hours=2)
    idol_xp, potion = compute(db_conn, user_id)
    assert idol_xp == {idol: 10}
    assert potion == 10


def test_potion_fills_without_a_selection_and_caps_at_150(db_conn, make_user, game):
    user_id, _ = make_user()
    for n in range(20):  # 200 XP of history: a veteran starts with a full potion
        game(user_id, hours=n, origin="backfill" if n % 2 else "live")
    assert compute(db_conn, user_id) == ({}, POTION_CAP)


def test_anonymous_players_cannot_select_and_only_see_the_potion(client, make_user, make_idol, game):
    user_id, token = make_user()
    game(user_id, hours=1)
    assert client.post("/api/idol-xp/select", json={"idol_id": make_idol("X")},
                       headers={"Authorization": token}).status_code == 401
    assert client.get("/api/idol-xp/state", headers={"Authorization": token}).get_json() == {
        "potion": {"xp": 10, "cap": POTION_CAP}}
    assert client.get("/api/idol-xp/state").status_code == 400


def test_claim_keeps_the_potion(client, make_user, game):
    user_id, token = make_user()
    game(user_id, hours=1, attempts=1)
    res = client.post("/api/auth/claim", json={"username": "claimer", "password": PASSWORD},
                      headers={"Authorization": token})
    auth = {"Authorization": f"Bearer {res.get_json()['access_token']}"}
    state = client.get("/api/idol-xp/state", headers=auth).get_json()
    assert state["potion"]["xp"] == 14 and state["idols"] == [] and state["current"] is None


def test_one_current_selection_is_enforced(client, db_conn, make_idol, make_user):
    user_id, auth = register(client, "loyal")
    karina, winter = make_idol("Karina"), make_idol("Winter")
    client.post("/api/idol-xp/select", json={"idol_id": karina}, headers=auth)
    client.post("/api/idol-xp/select", json={"idol_id": winter}, headers=auth)
    client.post("/api/idol-xp/select", json={"idol_id": winter}, headers=auth)
    with db_conn.cursor() as cur:
        cur.execute("SELECT idol_id, selected_to IS NULL AS current FROM idol_selections WHERE user_id = %s ORDER BY id",
                    (user_id,))
        assert cur.fetchall() == [{"idol_id": karina, "current": False}, {"idol_id": winter, "current": True}]
        import psycopg
        with pytest.raises(psycopg.errors.UniqueViolation):
            cur.execute("INSERT INTO idol_selections (user_id, idol_id) VALUES (%s, %s)", (user_id, karina))
    db_conn.rollback()


@pytest.mark.parametrize("idol_id", [None, "1", 999999])
def test_only_published_idols_can_be_selected(client, db_conn, make_idol, idol_id):
    _, auth = register(client, "picky")
    hidden = make_idol("Hidden", is_published=False)
    for value in (idol_id, hidden):
        assert client.post("/api/idol-xp/select", json={"idol_id": value}, headers=auth).get_json() == {"error": "Unknown idol"}


def test_live_win_through_the_guess_route_goes_to_the_selected_idol(client, db_conn, make_idol):
    from utils import dates

    user_id, auth = register(client, "player")
    bias, answer = make_idol("Bias"), make_idol("Answer")
    with db_conn.cursor() as cur:
        cur.execute("UPDATE idols SET position = 'Vocalist'")
        cur.execute("INSERT INTO daily_picks (pick_date, idol_id, gamemode_id) VALUES (%s, %s, 1)",
                    (dates.get_today_date(), answer))
    db_conn.commit()
    client.post("/api/idol-xp/select", json={"idol_id": bias}, headers=auth)
    res = client.post("/api/game/classic/guess?gamemode_id=1",
                      json={"guessed_idol_id": answer, "game_date": dates.get_today_date_str()}, headers=auth)
    assert res.get_json()["guess_correct"] is True
    state = client.get("/api/idol-xp/state", headers=auth).get_json()
    assert [(i["idol_id"], i["xp"]) for i in state["idols"]] == [(bias, 14)]


def test_constants_drive_the_formula(monkeypatch):
    monkeypatch.setattr(xp_service, "LIVE_GAME_XP", 20)
    assert game_xp({"won": True, "is_calendar": False, "one_shot_win": False, "guesses_count": 9}) == 20
