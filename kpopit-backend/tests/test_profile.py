"""T42/T43: profile fields, visibility toggles and the public profile lookup."""

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


def test_new_accounts_are_public_with_match_history_private(client):
    _, auth = register(client, "newbie")
    assert client.get("/api/user/profile/settings", headers=auth).get_json() == {
        "bias_idol_id": None, "bias_group_id": None,
        "is_public": True, "show_match_history": False, "show_calendar": True,
    }
    me = client.get("/api/auth/me", headers=auth).get_json()["profile"]
    assert me["visibility"] == {"is_public": True, "show_match_history": False, "show_calendar": True}


def test_claimed_accounts_get_the_same_defaults(client, make_user):
    _, token = make_user()
    res = client.post("/api/auth/claim", json={"username": "claimer", "password": PASSWORD},
                      headers={"Authorization": token})
    auth = {"Authorization": f"Bearer {res.get_json()['access_token']}"}
    body = client.get("/api/user/profile/settings", headers=auth).get_json()
    assert (body["is_public"], body["show_match_history"], body["show_calendar"]) == (True, False, True)


def test_public_profile_shows_bias_stats_and_calendar(client, db_conn, make_idol, make_group):
    user_id, auth = register(client, "fanboy")
    idol, group = make_idol("Bias"), make_group("BiasGroup")
    assert settings(client, auth, bias_idol_id=idol, bias_group_id=group).status_code == 200
    played(db_conn, user_id, 1)
    played(db_conn, user_id, 0, won=False)
    played(db_conn, user_id, -1)  # a future day (date offset) never shows

    body = client.get("/api/profile/FANBOY").get_json()
    assert body["username"] == "fanboy" and body["is_private"] is False
    assert body["bias_idol"]["id"] == idol and body["bias_group"]["name"] == "BiasGroup"
    assert [day["date"] for day in body["calendar"]] == [
        (get_today_date() - timedelta(days=1)).isoformat(), get_today_date().isoformat()]
    assert body["calendar"][0] == {"date": body["calendar"][0]["date"], "games": 1, "wins": 1}
    assert body["match_history"] is None


@pytest.mark.parametrize(("toggle", "section"), [("show_match_history", "match_history"), ("show_calendar", "calendar")])
def test_each_toggle_hides_its_section(client, db_conn, toggle, section):
    user_id, auth = register(client, "toggler")
    played(db_conn, user_id, 1)
    settings(client, auth, show_match_history=True, show_calendar=True)
    assert client.get("/api/profile/toggler").get_json()[section]
    settings(client, auth, **{toggle: False})
    body = client.get("/api/profile/toggler").get_json()
    assert body[section] is None
    other = "calendar" if section == "match_history" else "match_history"
    assert body[other]


def test_private_profile_hides_everything(client, db_conn, make_idol):
    user_id, auth = register(client, "hidden")
    played(db_conn, user_id, 1)
    settings(client, auth, bias_idol_id=make_idol("Secret"), show_match_history=True, is_public=False)
    assert client.get("/api/profile/hidden").get_json() == {"username": "hidden", "is_private": True}


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
