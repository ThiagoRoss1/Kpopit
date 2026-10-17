"""
TEST_DATE_OFFSET moves the game day only. Tokens, refresh expiry and every other
real moment use the real clock, so a logged-in session keeps working with an offset.
"""

from datetime import datetime, timedelta, timezone

import jwt as pyjwt
import pytest

from utils import dates


@pytest.fixture
def offset_plus_one(monkeypatch):
    monkeypatch.setattr(dates, "TEST_MODE", True)
    monkeypatch.setattr(dates, "TEST_DATE_OFFSET", 1)


def _register(client, username="offsetuser"):
    res = client.post(
        "/api/auth/register",
        json={"username": username, "password": "password123", "email": f"{username}@example.com"},
    )
    assert res.status_code == 201, res.get_json()
    return res.get_json()["access_token"]


def test_game_date_is_real_date_plus_offset(offset_plus_one):
    real_today = datetime.now(dates.TIMEZONE_EST).date()
    assert dates.get_today_date() == real_today + timedelta(days=1)
    assert dates.get_today_date_str() == (real_today + timedelta(days=1)).isoformat()


def test_real_time_helpers_ignore_offset(offset_plus_one):
    assert abs((dates.utc_now() - datetime.now(timezone.utc)).total_seconds()) < 5
    assert abs((dates.est_now() - datetime.now(timezone.utc)).total_seconds()) < 5
    stamp = datetime.fromisoformat(dates.get_current_timestamp())
    assert abs((stamp - datetime.now(timezone.utc)).total_seconds()) < 5


def test_access_token_is_not_issued_in_the_future(client, offset_plus_one):
    access = _register(client)
    claims = pyjwt.decode(access, options={"verify_signature": False})
    now = datetime.now(timezone.utc).timestamp()
    assert claims["iat"] <= now + 5
    assert claims["exp"] - claims["iat"] <= 3600 + 5


def test_login_me_and_refresh_work_with_offset(client, offset_plus_one):
    _register(client, "offsetlogin")

    res = client.post("/api/auth/login", json={"identifier": "offsetlogin", "password": "password123"})
    assert res.status_code == 200, res.get_json()
    access = res.get_json()["access_token"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert me.status_code == 200, me.get_json()
    assert me.get_json()["user_credentials"]["username"] == "offsetlogin"

    refreshed = client.post("/api/auth/refresh")
    assert refreshed.status_code == 200, refreshed.get_json()
    me2 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {refreshed.get_json()['access_token']}"})
    assert me2.status_code == 200
