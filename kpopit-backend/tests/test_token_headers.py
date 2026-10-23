"""T47: routes keyed by the anonymous token read it from X-User-Token, never from the URL path.
A missing or unknown token is rejected as before; the old path routes are gone."""

import uuid

import pytest

ROUTES = [
    ("get", "/api/stats?gamemode_id=1"),
    ("get", "/api/daily-rank?gamemode_id=1"),
    ("get", "/api/game-state?gamemode_id=1"),
    ("post", "/api/game-state?gamemode_id=1"),
    ("post", "/api/generate-transfer-code"),
    ("get", "/api/get-active-transfer-code"),
]


def call(client, method, url, token=None):
    headers = {"X-User-Token": token} if token is not None else {}
    kwargs = {"json": {"game_state": {}}} if method == "post" else {}
    return getattr(client, method)(url, headers=headers, **kwargs)


@pytest.mark.parametrize(("method", "url"), ROUTES)
def test_header_token_is_accepted(client, make_user, method, url):
    _, token = make_user()
    res = call(client, method, url, token)
    assert res.status_code == 200, res.get_json()
    assert token not in res.get_data(as_text=True)


@pytest.mark.parametrize(("method", "url"), ROUTES)
@pytest.mark.parametrize("token", [None, "", "   "])
def test_missing_token_is_rejected(client, method, url, token):
    res = call(client, method, url, token)
    assert (res.status_code, res.get_json()) == (400, {"error": "Missing user token"})


@pytest.mark.parametrize(("method", "url"), ROUTES)
@pytest.mark.parametrize("token", [str(uuid.uuid4()), "not-a-uuid"])
def test_unknown_token_is_rejected_as_before(client, method, url, token):
    res = call(client, method, url, token)
    assert (res.status_code, res.get_json()) == (400, {"error": "Invalid user token"})
    assert token not in res.get_data(as_text=True)


@pytest.mark.parametrize(("method", "url"), ROUTES)
def test_old_token_paths_are_gone(client, make_user, method, url):
    _, token = make_user()
    path, _, query = url.partition("?")
    res = call(client, method, f"{path}/{token}?{query}")
    assert res.status_code in (404, 405)


def test_header_wins_over_a_bearer_for_the_same_route(client, make_user, make_access_jwt):
    owner_id, owner_token = make_user()
    _, other_token = make_user()
    res = client.get(
        "/api/stats?gamemode_id=1",
        headers={"X-User-Token": other_token, "Authorization": f"Bearer {make_access_jwt(owner_id, owner_token)}"},
    )
    assert res.status_code == 200
    assert res.get_json()["wins_count"] == 0
