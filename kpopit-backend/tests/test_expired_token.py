"""T33: a present-but-invalid/expired access token is a 401 (so the client refreshes),
never an anonymous 200 with an empty album that React Query would cache."""

from datetime import timedelta

import jwt as pyjwt
import os
import pytest

from utils.dates import utc_now


def expired_jwt(user_id, token):
    past = utc_now() - timedelta(hours=2)
    payload = {
        "sub": token, "user_id": user_id, "username": "u", "is_admin": False, "is_authenticated": True,
        "type": "access", "iat": past, "exp": past + timedelta(hours=1),
    }
    return pyjwt.encode(payload, os.environ["JWT_SECRET_KEY"], algorithm="HS256")


@pytest.mark.parametrize("url", ["/api/collections/list", "/api/collections/album/1"])
@pytest.mark.parametrize("kind", ["expired", "garbage"])
def test_collections_reject_a_bad_bearer(client, db_conn, make_user, collection_page, url, kind):
    user_id, token = make_user()
    collection_page(n_members=2)
    bearer = expired_jwt(user_id, token) if kind == "expired" else "not.a.jwt"
    res = client.get(url, headers={"Authorization": f"Bearer {bearer}"})
    assert res.status_code == 401
    assert res.get_json() == {"error": "Invalid or expired token"}


def test_guess_routes_reject_a_bad_bearer(client, make_user):
    user_id, token = make_user()
    res = client.post(
        "/api/game/classic/guess?gamemode_id=1",
        json={"guessed_idol_id": 1, "answer_id": 1, "current_attempt": 1, "game_date": "2000-01-01"},
        headers={"Authorization": f"Bearer {expired_jwt(user_id, token)}"},
    )
    assert res.status_code == 401


@pytest.mark.parametrize("header", ["Bearer", "bearer not.a.jwt", "BEARER not.a.jwt", "Basic nonsense", "not-a-token"])
def test_malformed_present_authorization_cannot_be_cached_as_anonymous(client, header):
    assert client.get("/api/collections/list", headers={"Authorization": header}).status_code == 401


def test_valid_jwt_anonymous_uuid_and_no_header_still_work(client, make_user, collection_page, make_access_jwt):
    user_id, token = make_user()
    collection_page(n_members=2)
    for headers in ({}, {"Authorization": token}, {"Authorization": f"Bearer {make_access_jwt(user_id, token)}"}):
        assert client.get("/api/collections/list", headers=headers).status_code == 200
