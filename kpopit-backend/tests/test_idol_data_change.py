"""T52: an idol's data changes after they were a daily pick (reference case: Hyunjin, picked as
LOONA, now in LATENCY). The old day still resolves, finished games still open, a first play of that
day works, and every feedback uses the idol's current data."""

from datetime import timedelta

import pytest

from utils.dates import get_today_date

OLD_DAY = (get_today_date() - timedelta(days=3)).isoformat()


@pytest.fixture
def hyunjin(db_conn, make_idol, make_group, make_career):
    loona, latency = make_group("LOONA"), make_group("LATENCY")
    hyunjin = make_idol("Hyunjin")
    other = make_idol("Other")
    make_career(hyunjin, loona)
    make_career(other, loona)
    with db_conn.cursor() as cur:
        cur.execute("UPDATE idols SET height = 170, position = 'Vocalist' WHERE id IN (%s, %s)", (hyunjin, other))
        cur.execute("INSERT INTO daily_picks (pick_date, idol_id, gamemode_id) VALUES (%s, %s, 1)", (OLD_DAY, hyunjin))
    db_conn.commit()

    def move_to_latency():
        with db_conn.cursor() as cur:
            cur.execute("UPDATE idol_career SET is_active = FALSE, end_year = 2023 WHERE idol_id = %s", (hyunjin,))
            cur.execute("INSERT INTO idol_career (idol_id, group_id, is_active, start_year) VALUES (%s, %s, TRUE, 2025)",
                        (hyunjin, latency))
            cur.execute("UPDATE idols SET height = 165, position = 'Rapper' WHERE id = %s", (hyunjin,))
        db_conn.commit()

    return {"hyunjin": hyunjin, "other": other, "move": move_to_latency}


def guess(client, token, guessed):
    return client.post(f"/api/calendar/classic/{OLD_DAY}/guess", json={"guessed_idol_id": guessed},
                       headers={"Authorization": token})


def view(client, token):
    return client.get(f"/api/calendar/classic/{OLD_DAY}", headers={"Authorization": token})


def test_old_pick_survives_a_group_height_and_position_change(client, make_user, hyunjin):
    _, finisher = make_user()
    _, newcomer = make_user()
    guess(client, finisher, hyunjin["other"])
    assert guess(client, finisher, hyunjin["hyunjin"]).get_json()["guess_correct"] is True

    hyunjin["move"]()

    # The finished game still opens, with feedback recomputed against today's data.
    old = view(client, finisher)
    assert old.status_code == 200
    body = old.get_json()
    assert body["status"] == "won_calendar" and body["answer"]["idol_id"] == hyunjin["hyunjin"]
    first, winning = body["game"]["today_guesses_details"]
    assert first["feedback"]["groups"]["status"] == "partial"  # Other is in LOONA; Hyunjin was, and is now in LATENCY
    assert first["feedback"]["height"]["status"] == "higher"  # guess 170 vs her new 165 (was "correct")
    assert first["feedback"]["position"]["status"] == "incorrect"
    assert winning["guess_correct"] is True
    assert body["puzzle"]["groups"] == ["LATENCY"]

    # A first play of that day still resolves the old pick and compares with the current data.
    assert view(client, newcomer).get_json()["status"] == "not_played"
    miss = guess(client, newcomer, hyunjin["other"]).get_json()
    assert miss["guess_correct"] is False
    assert miss["feedback"]["groups"]["status"] == "partial"
    assert miss["feedback"]["height"]["status"] == "higher"
    assert guess(client, newcomer, hyunjin["hyunjin"]).get_json()["guess_correct"] is True


def test_live_restore_of_that_day_after_the_change(client, db_conn, make_user, hyunjin, monkeypatch):
    from utils import dates

    user_id, token = make_user()
    guess(client, token, hyunjin["other"])
    hyunjin["move"]()
    # Restoring the day the game was played (as if it were still that day) also uses the new data.
    monkeypatch.setattr(dates, "TEST_MODE", True)
    monkeypatch.setattr(dates, "TEST_DATE_OFFSET", -3)
    restored = client.get("/api/game/restore-session", headers={"Authorization": token}).get_json()
    [only] = restored["classic"]["today_guesses_details"]
    assert only["feedback"]["groups"]["status"] == "partial"
    assert only["feedback"]["height"]["status"] == "higher"
