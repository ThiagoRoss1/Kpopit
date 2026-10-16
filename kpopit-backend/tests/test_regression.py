"""
Backend regression: Classic/Blurry guess routes, save_user_history (score, streak,
one-shot, double-win guard), auth (login, refresh, claim, reset via the outbox), the Collections
grant through the guess route (new card + level up) and the idol routes. Real DB rows, no mocks.
"""

from datetime import timedelta
from urllib.parse import parse_qs, urlparse

import pytest

from services.game_service import GameService
from utils import dates
from utils.dates import get_today_date


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def idol_with(db_conn, make_idol):
    """A published idol with Classic attributes, optionally nullable."""

    def _make(name, **attrs):
        attrs.setdefault("position", "Vocalist")
        idol_id = make_idol(name)
        if attrs:
            cols = ", ".join(f"{k} = %s" for k in attrs)
            with db_conn.cursor() as cur:
                cur.execute(f"UPDATE idols SET {cols} WHERE id = %s", (*attrs.values(), idol_id))
            db_conn.commit()
        return idol_id

    return _make


@pytest.fixture
def pin_idol(db_conn):
    """Pin the idol pick for a mode and date (default: today)."""

    def _pin(idol_id, gamemode_id=1, pick_date=None):
        pick_date = pick_date or get_today_date()
        with db_conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO daily_picks (pick_date, idol_id, gamemode_id) VALUES (%s, %s, %s)
                ON CONFLICT (pick_date, gamemode_id) DO UPDATE SET idol_id = EXCLUDED.idol_id
                """,
                (pick_date, idol_id, gamemode_id),
            )
        db_conn.commit()

    return _pin


@pytest.fixture
def blurry(db_conn):
    def _activate(idol_id):
        with db_conn.cursor() as cur:
            cur.execute(
                "INSERT INTO blurry_mode_data (idol_id, blur_image_path, is_active) VALUES (%s, '/b.webp', TRUE)",
                (idol_id,),
            )
        db_conn.commit()

    return _activate


def guess(client, mode, token, guessed, answer, attempt, game_date=None):
    return client.post(
        f"/api/game/{mode}/guess?gamemode_id={1 if mode == 'classic' else 2}",
        json={
            "guessed_idol_id": guessed,
            "answer_id": answer,
            "current_attempt": attempt,
            "game_date": game_date or dates.get_today_date_str(),
        },
        headers={"Authorization": token},
    )


def history(db_conn, user_id, gamemode_id=1):
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT date, guesses_count, won, one_shot_win, score FROM daily_user_history "
            "WHERE user_id = %s AND gamemode_id = %s ORDER BY date",
            (user_id, gamemode_id),
        )
        days = cur.fetchall()
        cur.execute("SELECT * FROM user_history WHERE user_id = %s AND gamemode_id = %s", (user_id, gamemode_id))
        return days, cur.fetchone()


def play_day(monkeypatch, offset):
    monkeypatch.setattr(dates, "TEST_MODE", offset != 0)
    monkeypatch.setattr(dates, "TEST_DATE_OFFSET", offset)


# ---------------------------------------------------------------------------
# Classic guess route
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("side", ["guess", "answer", "both"])
@pytest.mark.parametrize("field,feedback_key", [("position", "position"), ("height", "height"),
                                               ("birth_date", "birth_date"), ("debut_year", "idol_debut_year")])
def test_classic_nullable_feedback_is_unknown(client, make_user, idol_with, pin_idol, side, field, feedback_key):
    _, token = make_user()
    attributes = {"position": "Vocalist", "height": 165, "birth_date": "2000-01-01", "debut_year": 2018}
    answer_attributes, guessed_attributes = dict(attributes), dict(attributes)
    if side in ("answer", "both"):
        answer_attributes[field] = None
    if side in ("guess", "both"):
        guessed_attributes[field] = None
    answer = idol_with("Answer", **answer_attributes)
    guessed = idol_with("Guessed", **guessed_attributes)
    pin_idol(answer)
    result = guess(client, "classic", token, guessed, answer, 1)
    assert result.status_code == 200, result.get_json()
    feedback = result.get_json()["feedback"][feedback_key]
    assert feedback["status"] == "incorrect"  # unknown is never a match or a numeric direction
    assert feedback["correct_items"] == []

def test_classic_wrong_guess_feedback(client, make_user, make_group, make_career, idol_with, pin_idol):
    _, token = make_user()
    group = make_group("Shared")
    answer = idol_with("Answer", height=165, debut_year=2018, position="Main Vocalist, Leader", nationality="South Korea")
    wrong = idol_with("Wrong", height=170, debut_year=2015, position="Leader", nationality="Japan", gender="M")
    make_career(answer, group)
    make_career(wrong, group)
    pin_idol(answer)

    res = guess(client, "classic", token, wrong, answer, 1)
    assert res.status_code == 200, res.get_json()
    body = res.get_json()
    fb = body["feedback"]
    assert body["guess_correct"] is False
    assert fb["artist_name"]["status"] == "incorrect"
    assert fb["gender"]["status"] == "incorrect"
    assert fb["height"]["status"] == "higher"
    assert fb["idol_debut_year"]["status"] == "lower"
    assert fb["position"] == {"status": "partial", "correct_items": ["Leader"], "incorrect_items": []}
    assert fb["nationality"]["status"] == "incorrect"
    assert fb["groups"]["status"] == "correct"
    assert body["guessed_idol_data"]["idol_id"] == wrong
    assert body["guessed_idol_data"]["active_group"] == "Shared"
    assert body["card_granted"] is None


def test_classic_correct_guess_records_win(client, db_conn, make_user, idol_with, pin_idol):
    user_id, token = make_user()
    answer = idol_with("Winner")
    other = idol_with("Other")
    pin_idol(answer)

    assert guess(client, "classic", token, other, answer, 1).get_json()["guess_correct"] is False
    res = guess(client, "classic", token, answer, answer, 2)
    assert res.get_json()["guess_correct"] is True

    [day], agg = history(db_conn, user_id)
    assert (day["guesses_count"], day["won"], day["one_shot_win"]) == (2, True, False)
    assert float(day["score"]) == pytest.approx(9.05)
    assert (agg["wins_count"], agg["current_streak"], agg["one_shot_wins"]) == (1, 1, 0)


@pytest.mark.parametrize("mode", ["classic", "blurry"])
def test_guess_rejects_stale_game_date(client, make_user, idol_with, pin_idol, mode):
    _, token = make_user()
    idol = idol_with("Any")
    pin_idol(idol, 1 if mode == "classic" else 2)
    yesterday = (get_today_date() - timedelta(days=1)).isoformat()
    res = guess(client, mode, token, idol, idol, 1, game_date=yesterday)
    assert res.status_code == 400
    assert res.get_json()["error"] == "Game date mismatch"


@pytest.mark.parametrize("mode", ["classic", "blurry"])
def test_guess_rejects_unknown_token(client, idol_with, pin_idol, mode):
    idol = idol_with("Any")
    res = guess(client, mode, "11111111-1111-4111-8111-111111111111", idol, idol, 1)
    assert res.status_code == 400
    assert res.get_json()["error"] == "Invalid user token"


def test_classic_jwt_user_is_resolved_from_token(client, db_conn, make_user, make_access_jwt, idol_with, pin_idol):
    user_id, token = make_user()
    idol = idol_with("Jwt Idol")
    pin_idol(idol)
    res = guess(client, "classic", f"Bearer {make_access_jwt(user_id, token)}", idol, idol, 1)
    assert res.status_code == 200
    [day], _ = history(db_conn, user_id)
    assert day["won"] is True


# ---------------------------------------------------------------------------
# Blurry guess route
# ---------------------------------------------------------------------------

def test_blurry_wrong_then_correct(client, db_conn, make_user, idol_with, pin_idol, blurry):
    user_id, token = make_user()
    answer, other = idol_with("Blur A"), idol_with("Blur B")
    blurry(answer)
    blurry(other)
    pin_idol(answer, gamemode_id=2)

    wrong = guess(client, "blurry", token, other, answer, 1).get_json()
    assert wrong["guess_correct"] is False
    assert wrong["feedback"]["artist_name"]["status"] == "incorrect"
    assert wrong["guessed_idol_data"]["idol_id"] == other

    right = guess(client, "blurry", token, answer, answer, 2).get_json()
    assert right["guess_correct"] is True
    assert right["feedback"]["idol_id"]["status"] == "correct"
    [day], agg = history(db_conn, user_id, gamemode_id=2)
    assert (day["guesses_count"], day["won"]) == (2, True)
    assert agg["wins_count"] == 1


# ---------------------------------------------------------------------------
# save_user_history
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(("attempt", "score"), [(1, 10.0), (2, 9.05), (5, 6.70), (10, 4.07)])
def test_score_decays_with_attempts(db_conn, make_user, idol_with, attempt, score):
    user_id, _ = make_user()
    idol = idol_with("Score")
    today = dates.get_today_date_str()
    with db_conn.cursor() as cur:
        GameService(db_conn, None).save_user_history(
            db_conn, cur, user_id, 1, idol, {"artist_name": "Score"}, idol, attempt, today,
            dates.get_current_timestamp(), {},
        )
    [day], agg = history(db_conn, user_id)
    assert float(day["score"]) == pytest.approx(score, abs=0.01)
    assert day["one_shot_win"] is (attempt == 1)
    assert agg["one_shot_wins"] == (1 if attempt == 1 else 0)


def test_streak_counts_consecutive_days_and_resets_after_a_gap(client, db_conn, make_user, idol_with, pin_idol, monkeypatch):
    user_id, token = make_user()
    idol = idol_with("Daily")
    real_today = get_today_date()

    for offset in (0, 1, 2):
        play_day(monkeypatch, offset)
        pin_idol(idol, pick_date=real_today + timedelta(days=offset))
        assert guess(client, "classic", token, idol, idol, 1).get_json()["guess_correct"] is True
    _, agg = history(db_conn, user_id)
    assert (agg["current_streak"], agg["max_streak"], agg["wins_count"]) == (3, 3, 3)

    play_day(monkeypatch, 4)  # day 3 skipped
    pin_idol(idol, pick_date=real_today + timedelta(days=4))
    guess(client, "classic", token, idol, idol, 2)
    days, agg = history(db_conn, user_id)
    assert len(days) == 4
    assert (agg["current_streak"], agg["max_streak"], agg["wins_count"]) == (1, 3, 4)
    assert float(agg["average_guesses"]) == pytest.approx(1.25)


def test_second_win_same_day_does_not_double_count(client, db_conn, make_user, idol_with, pin_idol):
    user_id, token = make_user()
    idol = idol_with("Twice")
    pin_idol(idol)
    guess(client, "classic", token, idol, idol, 1)
    guess(client, "classic", token, idol, idol, 2)
    [day], agg = history(db_conn, user_id)
    assert day["won"] is True and day["one_shot_win"] is True
    assert (agg["wins_count"], agg["current_streak"], agg["one_shot_wins"]) == (1, 1, 1)


def test_losing_guesses_update_attempts_without_stats(client, db_conn, make_user, idol_with, pin_idol):
    user_id, token = make_user()
    answer, a, b = idol_with("Ans"), idol_with("A"), idol_with("B")
    pin_idol(answer)
    guess(client, "classic", token, a, answer, 1)
    guess(client, "classic", token, b, answer, 2)
    [day], agg = history(db_conn, user_id)
    assert (day["guesses_count"], day["won"], float(day["score"])) == (2, False, 0.0)
    assert agg is None


# ---------------------------------------------------------------------------
# Collections grant through the guess route
# ---------------------------------------------------------------------------

def test_classic_win_grants_new_card_then_levels_up_next_day(client, db_conn, make_user, collection_page, pin_idol, monkeypatch):
    user_id, token = make_user()
    page = collection_page(n_members=2)
    idol = page["idol_ids"][0]
    real_today = get_today_date()
    with db_conn.cursor() as cur:
        cur.execute("UPDATE idols SET position = 'Vocalist'")
    db_conn.commit()

    pin_idol(idol)
    first = guess(client, "classic", token, idol, idol, 1).get_json()["card_granted"]
    assert first["is_new"] is True and first["level"] == 1 and first["times_won"] == 1

    # Same day again: no second grant.
    assert guess(client, "classic", token, idol, idol, 2).get_json()["card_granted"] is None

    play_day(monkeypatch, 1)
    pin_idol(idol, pick_date=real_today + timedelta(days=1))
    second = guess(client, "classic", token, idol, idol, 1).get_json()["card_granted"]
    assert second["is_new"] is False and second["level"] == 2 and second["times_won"] == 2
    assert second["card_id"] == first["card_id"]

    with db_conn.cursor() as cur:
        cur.execute("SELECT level, times_won FROM user_cards WHERE user_id = %s", (user_id,))
        assert cur.fetchall() == [{"level": 2, "times_won": 2}]


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

PASSWORD = "password123"


def register(client, username, email=None):
    res = client.post("/api/auth/register", json={"username": username, "password": PASSWORD, "email": email})
    assert res.status_code == 201, res.get_json()
    return res.get_json()


def test_login_success_and_failures(client):
    register(client, "loginok", "loginok@example.com")

    by_name = client.post("/api/auth/login", json={"identifier": "loginok", "password": PASSWORD})
    by_email = client.post("/api/auth/login", json={"identifier": "loginok@example.com", "password": PASSWORD})
    assert by_name.status_code == 200 and by_email.status_code == 200
    assert by_name.get_json()["user"]["username"] == "loginok"

    bad = client.post("/api/auth/login", json={"identifier": "loginok", "password": "wrong-password"})
    unknown = client.post("/api/auth/login", json={"identifier": "nobody", "password": PASSWORD})
    assert bad.status_code == unknown.status_code == 401
    assert bad.get_json() == unknown.get_json()


def test_refresh_cookie_flow_and_logout_revokes(client):
    register(client, "refresher")
    assert client.post("/api/auth/refresh").status_code == 200

    client.post("/api/auth/logout")
    assert client.post("/api/auth/refresh").status_code == 401


def test_refresh_with_unknown_cookie_is_401(client):
    client.set_cookie("refresh_token", "not-a-real-token")
    res = client.post("/api/auth/refresh")
    assert res.status_code == 401


def test_claim_keeps_user_id_and_history(client, db_conn, make_user, idol_with, pin_idol):
    anon_id, token = make_user()
    idol = idol_with("Claimed")
    pin_idol(idol)
    guess(client, "classic", token, idol, idol, 1)

    res = client.post(
        "/api/auth/claim",
        json={"username": "claimer", "password": PASSWORD, "email": "claimer@example.com"},
        headers={"Authorization": token},
    )
    assert res.status_code in (200, 201), res.get_json()
    assert res.get_json()["user"]["user_id"] == anon_id

    days, agg = history(db_conn, anon_id)
    assert len(days) == 1 and agg["wins_count"] == 1
    again = client.post("/api/auth/claim", json={"username": "claimer2", "password": PASSWORD}, headers={"Authorization": token})
    assert again.status_code == 409


def test_password_reset_via_outbox(client, email_outbox):
    register(client, "resetter", "resetter@example.com")
    assert client.post("/api/auth/refresh").status_code == 200

    res = client.post("/api/auth/email/forgot-password", json={"email": "resetter@example.com"})
    assert res.status_code == 200
    mail = email_outbox.wait_for("resetter@example.com")
    assert mail is not None and "/reset-password?token=" in mail["link"]
    token = parse_qs(urlparse(mail["link"]).query)["token"][0]

    done = client.post("/api/auth/email/reset-password", json={"token": token, "password": "brand-new-pass"})
    assert done.status_code == 200, done.get_json()

    # Every refresh token is revoked; the old password stops working, the new one logs in.
    assert client.post("/api/auth/refresh").status_code == 401
    assert client.post("/api/auth/login", json={"identifier": "resetter", "password": PASSWORD}).status_code == 401
    assert client.post("/api/auth/login", json={"identifier": "resetter", "password": "brand-new-pass"}).status_code == 200
    # The link works once.
    assert client.post("/api/auth/email/reset-password", json={"token": token, "password": "another-pass1"}).status_code == 400


# ---------------------------------------------------------------------------
# Idol routes
# ---------------------------------------------------------------------------

def test_idols_list_shape(client, make_group, make_career, idol_with, blurry):
    group = make_group("ListGroup")
    a = idol_with("Listed")
    make_career(a, group)
    blurry(a)
    res = client.get("/api/idols-list")
    assert res.status_code == 200
    rows = {r["id"]: r for r in res.get_json()}
    assert rows[a]["artist_name"] == "Listed"
    assert rows[a]["active_group"] == "ListGroup"


def test_idols_list_group_and_company_order_is_stable(client, db_conn, make_group, make_career, idol_with):
    idol = idol_with("Multi")
    for name in ("Zeta", "Alpha", "Mid"):
        make_career(idol, make_group(name))
    with db_conn.cursor() as cur:
        for name in ("Zco", "Aco"):
            cur.execute("INSERT INTO companies (name) VALUES (%s) RETURNING id", (name,))
            cur.execute("INSERT INTO idol_company_affiliation (idol_id, company_id) VALUES (%s, %s)", (idol, cur.fetchone()["id"]))
    db_conn.commit()

    [row] = [r for r in client.get("/api/idols-list").get_json() if r["id"] == idol]
    assert row["active_group"] == "Alpha, Mid, Zeta"
    assert row["groups"] == ["Alpha", "Mid", "Zeta"]
    assert row["companies"] == ["Aco", "Zco"]


def test_idols_list_hides_unpublished(client, make_idol):
    hidden = make_idol("Hidden", is_published=False)
    shown = make_idol("Shown")
    ids = {r["id"] for r in client.get("/api/idols-list").get_json()}
    assert shown in ids and hidden not in ids


def test_idols_page_and_profile(client, make_group, make_career, idol_with, make_idol):
    group = make_group("PageGroup")
    idol = idol_with("Profiled", height=160)
    make_career(idol, group)
    hidden = make_idol("Draft", is_published=False)

    page = client.get("/api/idols-page")
    assert page.status_code == 200
    assert idol in {r["id"] for r in _rows(page.get_json())}

    profile = client.get(f"/api/idols-page/{idol}")
    assert profile.status_code == 200
    assert "Profiled" in profile.get_data(as_text=True)

    assert client.get(f"/api/idols-page/{hidden}").status_code == 404
    assert client.get("/api/idols-page/999999").status_code == 404


def _rows(payload):
    if isinstance(payload, list):
        return payload
    for value in payload.values():
        if isinstance(value, list):
            return value
    return []


def test_win_log_names_the_internal_user_id_only(client, make_user, idol_with, pin_idol, caplog):
    import logging

    user_id, token = make_user()
    idol = idol_with("Logged")
    pin_idol(idol)
    with caplog.at_level(logging.INFO, logger="services.game_service"):
        guess(client, "classic", token, idol, idol, 2)
    assert f"Victory! User {user_id} won gamemode 1 in 2 attempts at date {dates.get_today_date_str()}." in caplog.text
    assert token not in caplog.text
