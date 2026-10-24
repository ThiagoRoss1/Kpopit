"""T47: routes keyed by the anonymous token read it from X-User-Token. The old /<user_token> path
still works for one release (the header wins); a missing or unknown token is rejected as before,
and request logs never show a token."""

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


def path_url(url, token):
    path, _, query = url.partition("?")
    return f"{path}/{token}" + (f"?{query}" if query else "")


@pytest.mark.parametrize(("method", "url"), ROUTES)
def test_old_token_path_still_works_for_one_release(client, make_user, method, url):
    _, token = make_user()
    res = call(client, method, path_url(url, token))
    assert res.status_code == 200, res.get_json()


@pytest.mark.parametrize(("method", "url"), ROUTES)
def test_unknown_path_token_is_rejected_as_before(client, method, url):
    token = str(uuid.uuid4())
    res = call(client, method, path_url(url, token))
    assert (res.status_code, res.get_json()) == (400, {"error": "Invalid user token"})
    assert token not in res.get_data(as_text=True)


def test_header_wins_over_the_path(client, db_conn, make_user):
    header_id, header_token = make_user()
    _, path_token = make_user()
    with db_conn.cursor() as cur:
        cur.execute("INSERT INTO user_history (user_id, gamemode_id, current_streak, max_streak, wins_count) "
                    "VALUES (%s, 1, 1, 1, 7)", (header_id,))
    db_conn.commit()
    res = client.get(f"/api/stats/{path_token}?gamemode_id=1", headers={"X-User-Token": header_token})
    assert res.get_json()["wins_count"] == 7
    assert client.get(f"/api/stats/{path_token}?gamemode_id=1").get_json()["wins_count"] == 0


def test_request_logs_never_show_a_token(make_user):
    import logging

    from utils.log_redaction import REQUEST_LOGGERS, RedactTokensFilter

    token = str(uuid.uuid4())
    record = logging.LogRecord("werkzeug", logging.INFO, __file__, 1, '"%s /api/stats/%s HTTP/1.1" %s',
                               ("GET", token, 200), None)
    assert RedactTokensFilter().filter(record) is True
    assert record.getMessage() == '"GET /api/stats/[token] HTTP/1.1" 200'
    for name in REQUEST_LOGGERS:
        assert any(isinstance(f, RedactTokensFilter) for f in logging.getLogger(name).filters), name


def test_header_wins_over_a_bearer_for_the_same_route(client, make_user, make_access_jwt):
    owner_id, owner_token = make_user()
    _, other_token = make_user()
    res = client.get(
        "/api/stats?gamemode_id=1",
        headers={"X-User-Token": other_token, "Authorization": f"Bearer {make_access_jwt(owner_id, owner_token)}"},
    )
    assert res.status_code == 200
    assert res.get_json()["wins_count"] == 0
