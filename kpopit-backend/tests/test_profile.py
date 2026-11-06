"""Profile fields, visibility toggles and the public profile lookup."""

import importlib
from datetime import timedelta

import pytest

from utils.dates import get_today_date

PASSWORD = "password123"


def register(client, username):
    res = client.post("/api/auth/register", json={"username": username, "password": PASSWORD})
    assert res.status_code == 201, res.get_json()
    body = res.get_json()
    return body["user"]["user_id"], {"Authorization": f"Bearer {body['access_token']}"}


def settings(client, auth, **fields):
    return client.patch("/api/user/profile/settings", json=fields, headers=auth)


def played(db_conn, user_id, days_ago, won=True, gamemode_id=1):
    with db_conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO daily_user_history (user_id, date, gamemode_id, guesses_count, won, guessed_ids)
            VALUES (%s, %s, %s, 2, %s, '{1,2}')
            """,
            (user_id, get_today_date() - timedelta(days=days_ago), gamemode_id, won),
        )
    db_conn.commit()


def test_new_accounts_are_public_with_match_history_shown(client):
    _, auth = register(client, "newbie")
    assert client.get("/api/user/profile/settings", headers=auth).get_json() == {
        "bias_idol_id": None, "bias_group_id": None,
        "is_public": True, "show_match_history": True, "show_activity": True,
    }
    me = client.get("/api/auth/me", headers=auth).get_json()["profile"]
    assert me["visibility"] == {"is_public": True, "show_match_history": True, "show_activity": True}


def test_match_history_default_applies_to_new_rows_only(client, db_conn):
    user_id, auth = register(client, "veteran")
    settings(client, auth, show_match_history=False)
    with db_conn.cursor() as cur:
        cur.execute("SELECT column_default FROM information_schema.columns "
                    "WHERE table_name = 'user_profiles' AND column_name = 'show_match_history'")
        assert cur.fetchone()["column_default"] == "true"
    # Logging in again (no new profile row) keeps the owner's choice.
    client.post("/api/auth/login", json={"username": "veteran", "password": PASSWORD})
    assert client.get("/api/user/profile/settings", headers=auth).get_json()["show_match_history"] is False


def test_claimed_accounts_get_the_same_defaults(client, make_user):
    _, token = make_user()
    res = client.post("/api/auth/claim", json={"username": "claimer", "password": PASSWORD},
                      headers={"Authorization": token})
    auth = {"Authorization": f"Bearer {res.get_json()['access_token']}"}
    body = client.get("/api/user/profile/settings", headers=auth).get_json()
    assert (body["is_public"], body["show_match_history"], body["show_activity"]) == (True, True, True)


def test_public_profile_shows_bias_and_activity(client, db_conn, make_idol, make_group):
    user_id, auth = register(client, "fanboy")
    idol, group = make_idol("Bias"), make_group("BiasGroup")
    assert settings(client, auth, bias_idol_id=idol, bias_group_id=group).status_code == 200
    played(db_conn, user_id, 1)
    played(db_conn, user_id, 1, gamemode_id=2)
    played(db_conn, user_id, 0, won=False)
    played(db_conn, user_id, -1)  # a future day (date offset) never shows

    res = client.get("/api/profile/FANBOY")
    assert res.headers["Cache-Control"] == "no-store"
    body = res.get_json()
    assert body["username"] == "fanboy" and body["is_private"] is False and body["is_owner"] is False
    assert body["bias_idol"]["id"] == idol and body["bias_group"]["name"] == "BiasGroup"
    assert body["activity"] == [
        {"date": (get_today_date() - timedelta(days=1)).isoformat(), "modes": 2},
        {"date": get_today_date().isoformat(), "modes": 1},
    ]
    assert body["history_visible"] is True and body["today"] == get_today_date().isoformat()
    assert client.get("/api/profile/fanboy", headers=auth).get_json()["is_owner"] is True


def test_activity_covers_the_last_18_weeks(client, db_conn):
    user_id, _ = register(client, "heatmap")
    played(db_conn, user_id, 125)
    played(db_conn, user_id, 126)  # outside the 126-day window
    assert [day["date"] for day in client.get("/api/profile/heatmap").get_json()["activity"]] == [
        (get_today_date() - timedelta(days=125)).isoformat()]


@pytest.mark.parametrize(("toggle", "field"), [("show_match_history", "history_visible"), ("show_activity", "activity")])
def test_each_toggle_hides_its_section_from_visitors_only(client, db_conn, toggle, field):
    user_id, auth = register(client, "toggler")
    played(db_conn, user_id, 1)
    assert client.get("/api/profile/toggler").get_json()[field]
    settings(client, auth, **{toggle: False})
    assert not client.get("/api/profile/toggler").get_json()[field]
    assert client.get("/api/profile/toggler", headers=auth).get_json()[field]


def test_private_profile_hides_everything(client, db_conn, make_idol):
    user_id, auth = register(client, "hidden")
    played(db_conn, user_id, 1)
    settings(client, auth, bias_idol_id=make_idol("Secret"), show_match_history=True, is_public=False)
    assert client.get("/api/profile/hidden").get_json() == {"username": "hidden", "is_private": True}
    assert client.get("/api/profile/hidden/stats").status_code == 404
    assert client.get("/api/profile/hidden/history").status_code == 404
    owner_view = client.get("/api/profile/hidden", headers=auth).get_json()
    assert owner_view["is_private"] is False and owner_view["is_owner"] is True
    assert client.get("/api/profile/hidden/history", headers=auth).status_code == 200


def test_anonymous_users_have_no_profile(client, db_conn, make_user):
    user_id, token = make_user()
    with db_conn.cursor() as cur:
        cur.execute("UPDATE users SET username = 'ghost' WHERE id = %s", (user_id,))
        cur.execute("INSERT INTO user_profiles (user_id, display_name) VALUES (%s, 'ghost')", (user_id,))
    db_conn.commit()
    assert client.get("/api/profile/ghost").status_code == 404
    assert client.get("/api/profile/nobody").status_code == 404
    assert client.get("/api/profile/bad%20name").status_code == 404
    assert client.get("/api/user/profile/settings", headers={"Authorization": token}).status_code == 401
    assert client.patch("/api/user/profile/settings", json={"is_public": True},
                        headers={"Authorization": token}).status_code == 401


@pytest.mark.parametrize("fields", [{}, {"is_public": "yes"}, {"bias_idol_id": 999999}, {"bias_group_id": "1"},
                                    {"bias_idol_id": True}])
def test_invalid_settings_are_rejected(client, fields):
    _, auth = register(client, "picky")
    assert settings(client, auth, **fields).status_code == 400


def test_bias_can_be_cleared(client, make_idol):
    _, auth = register(client, "fickle")
    settings(client, auth, bias_idol_id=make_idol("Old Bias"))
    assert settings(client, auth, bias_idol_id=None).get_json()["bias_idol_id"] is None


def test_public_profile_flag_is_off_by_default(monkeypatch):
    import services.profile_service as profile_service

    monkeypatch.delenv("PUBLIC_PROFILE_ENABLED", raising=False)
    monkeypatch.setenv("PYTHON_DOTENV_DISABLED", "1")
    try:
        assert importlib.reload(profile_service).PUBLIC_PROFILE_ENABLED is False
    finally:
        monkeypatch.setenv("PUBLIC_PROFILE_ENABLED", "true")
        importlib.reload(profile_service)


def test_hero_shows_the_current_idol_xp_only_with_the_flag(client, db_conn, make_idol, monkeypatch):
    user_id, auth = register(client, "leveler")
    idol = make_idol("Bias")
    assert client.get("/api/profile/leveler").get_json()["idol_xp"] == {"current": None}
    client.post("/api/idol-xp/select", json={"idol_id": idol}, headers=auth)
    with db_conn.cursor() as cur:
        cur.execute("INSERT INTO daily_user_history (user_id, date, gamemode_id, guesses_count, won, won_at) "
                    "VALUES (%s, %s, 1, 5, TRUE, NOW())", (user_id, get_today_date()))
    db_conn.commit()
    assert client.get("/api/profile/leveler").get_json()["idol_xp"] == {"current": {
        "idol_id": idol, "artist_name": "Bias", "image_path": None, "xp": 10, "level": 1, "level_xp": 3,
        "next_level_xp": 12}}
    monkeypatch.setattr("services.xp_service.IDOL_XP_ENABLED", False)
    assert client.get("/api/profile/leveler").get_json()["idol_xp"] is None
