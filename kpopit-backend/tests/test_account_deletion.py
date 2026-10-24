"""Deletion request (password), cancel by logging in within 15 days, and the daily purge task
that deletes only accounts past the grace period, with all their game and profile data."""

import pytest

from utils import dates

PASSWORD = "password123"
URL = "/api/tasks/purge-deleted-accounts"
KEY = "test-purge-key-0123456789"


@pytest.fixture
def purge_key(monkeypatch):
    monkeypatch.setenv("ACCOUNT_PURGE_AUTH_KEY", KEY)


def on_day(monkeypatch, offset):
    """Move the game-day clock the grace period runs on (like TEST_DATE_OFFSET)."""
    monkeypatch.setattr(dates, "TEST_MODE", offset != 0)
    monkeypatch.setattr(dates, "TEST_DATE_OFFSET", offset)


def register(client, username):
    res = client.post("/api/auth/register", json={"username": username, "password": PASSWORD})
    assert res.status_code == 201, res.get_json()
    body = res.get_json()
    return body["user"]["user_id"], {"Authorization": f"Bearer {body['access_token']}"}


def login(client, username):
    return client.post("/api/auth/login", json={"identifier": username, "password": PASSWORD})


def request_deletion(client, auth, password=PASSWORD):
    return client.post("/api/user/delete-account", json={"current_password": password}, headers=auth)


def purge(client):
    return client.post(URL, headers={"Authorization": f"Bearer {KEY}"})


def requested_at(db_conn, user_id):
    with db_conn.cursor() as cur:
        cur.execute("SELECT deletion_requested_at FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
    return row["deletion_requested_at"] if row else "gone"


def add_game_data(db_conn, user_id):
    with db_conn.cursor() as cur:
        cur.execute("INSERT INTO daily_user_history (user_id, date, gamemode_id, guesses_count, won) "
                    "VALUES (%s, %s, 1, 1, TRUE)", (user_id, dates.get_today_date()))
        cur.execute("INSERT INTO user_history (user_id, gamemode_id, current_streak, max_streak, wins_count) "
                    "VALUES (%s, 1, 1, 1, 1)", (user_id,))
    db_conn.commit()


def test_wrong_password_is_rejected(client, db_conn):
    user_id, auth = register(client, "keeper")
    res = request_deletion(client, auth, password="not-my-password")
    assert (res.status_code, res.get_json()) == (403, {"error": "Current password is incorrect"})
    assert request_deletion(client, auth, password="").status_code == 400
    assert requested_at(db_conn, user_id) is None


def test_request_stamps_the_date_and_ends_sessions(client, db_conn):
    user_id, auth = register(client, "leaver")
    res = request_deletion(client, auth)
    assert res.status_code == 200 and "deletion_scheduled_for" in res.get_json()
    assert requested_at(db_conn, user_id) is not None
    with db_conn.cursor() as cur:
        cur.execute("SELECT bool_and(revoked) AS all_revoked FROM refresh_tokens WHERE user_id = %s", (user_id,))
        assert cur.fetchone()["all_revoked"] is True
    assert client.get("/api/profile/leaver").status_code == 404


def test_anonymous_and_logged_out_callers_cannot_request(client, make_user):
    _, token = make_user()
    assert client.post("/api/user/delete-account", json={"current_password": PASSWORD},
                       headers={"Authorization": token}).status_code == 401
    assert client.post("/api/user/delete-account", json={"current_password": PASSWORD}).status_code == 401


def test_login_within_15_days_cancels(client, db_conn, monkeypatch, purge_key):
    user_id, auth = register(client, "changed")
    request_deletion(client, auth)
    on_day(monkeypatch, 14)
    res = login(client, "changed")
    assert res.status_code == 200 and res.get_json()["user"]["deletion_cancelled"] is True
    assert requested_at(db_conn, user_id) is None
    on_day(monkeypatch, 30)
    assert purge(client).get_json()["purged"] == 0


def test_task_deletes_only_accounts_past_15_days(client, db_conn, make_user, monkeypatch, purge_key):
    old_id, old_auth = register(client, "oldleaver")
    add_game_data(db_conn, old_id)
    request_deletion(client, old_auth)
    on_day(monkeypatch, 10)
    new_id, new_auth = register(client, "newleaver")
    request_deletion(client, new_auth)
    stayer_id, _ = register(client, "stayer")
    add_game_data(db_conn, stayer_id)
    anon_id, _ = make_user()

    on_day(monkeypatch, 14)
    assert purge(client).get_json() == {"message": "Purge successful", "purged": 0}
    on_day(monkeypatch, 15)
    assert purge(client).get_json()["purged"] == 1

    assert requested_at(db_conn, old_id) == "gone"
    with db_conn.cursor() as cur:
        for table in ("daily_user_history", "user_history", "user_profiles", "refresh_tokens", "user_cards"):
            cur.execute(f"SELECT COUNT(*) AS n FROM {table} WHERE user_id = %s", (old_id,))
            assert cur.fetchone()["n"] == 0, table
        cur.execute("SELECT id FROM users ORDER BY id")
        assert [r["id"] for r in cur.fetchall()] == sorted([new_id, stayer_id, anon_id])
        cur.execute("SELECT COUNT(*) AS n FROM daily_user_history WHERE user_id = %s", (stayer_id,))
        assert cur.fetchone()["n"] == 1
    assert requested_at(db_conn, new_id) is not None


def test_deleted_account_cannot_log_in(client, monkeypatch, purge_key):
    _, auth = register(client, "goner")
    request_deletion(client, auth)
    on_day(monkeypatch, 15)
    # Past the grace period but not yet purged: the login no longer cancels.
    assert login(client, "goner").status_code == 401
    purge(client)
    assert login(client, "goner").status_code == 401


@pytest.mark.parametrize("value", [None, ""])
def test_unset_key_disables_the_route(client, monkeypatch, value):
    if value is None:
        monkeypatch.delenv("ACCOUNT_PURGE_AUTH_KEY", raising=False)
    else:
        monkeypatch.setenv("ACCOUNT_PURGE_AUTH_KEY", value)
    res = client.post(URL, headers={"Authorization": "Bearer anything"})
    assert (res.status_code, res.get_json()) == (500, {"error": "Purge is not available"})


@pytest.mark.parametrize("header", [None, "Bearer ", "Bearer wrong-key", KEY, f"Basic {KEY}"])
def test_missing_or_wrong_key_is_rejected(client, purge_key, header):
    headers = {"Authorization": header} if header is not None else {}
    res = client.post(URL, headers=headers)
    assert (res.status_code, res.get_json()) == (401, {"error": "Unauthorized"})


def test_failure_answers_generically(client, purge_key, monkeypatch, caplog):
    from services import account_deletion_service

    def boom(*_args):
        raise RuntimeError("secret detail")

    monkeypatch.setattr(account_deletion_service.AccountDeletionService, "purge_due", boom)
    res = purge(client)
    assert (res.status_code, res.get_json()) == (500, {"error": "Purge failed"})
    assert "secret detail" not in res.get_data(as_text=True)


R2_SETTINGS = {
    "R2_ENDPOINT_URL": "http://127.0.0.1:9", "R2_AVATARS_ACCESS_KEY_ID": "test", "R2_AVATARS_SECRET_ACCESS_KEY": "test",
    "R2_AVATARS_BUCKET_NAME": "avatars-test", "R2_AVATARS_PREFIX": "avatars",
}


@pytest.fixture
def r2_deletes(monkeypatch):
    """Avatar bucket configured, with the storage call replaced by a recorder (nothing reaches R2)."""
    from utils.r2 import R2Client

    for name, value in R2_SETTINGS.items():
        monkeypatch.setenv(name, value)
    calls = []
    monkeypatch.setattr(R2Client, "__init__", lambda self: None)
    monkeypatch.setattr(R2Client, "delete_files", lambda self, keys: calls.append(list(keys)))
    return calls


def set_avatar(db_conn, user_id, avatar_url):
    with db_conn.cursor() as cur:
        cur.execute("UPDATE user_profiles SET avatar_url = %s WHERE user_id = %s", (avatar_url, user_id))
    db_conn.commit()


def test_purge_deletes_the_uploaded_avatar(client, db_conn, monkeypatch, purge_key, r2_deletes):
    user_id, auth = register(client, "pictured")
    set_avatar(db_conn, user_id, f"avatars/{user_id}.webp")
    stayer_id, _ = register(client, "stays")
    request_deletion(client, auth)
    on_day(monkeypatch, 15)
    assert purge(client).get_json()["purged"] == 1
    assert r2_deletes == [[f"avatars/{user_id}.webp"]]
    assert all(str(stayer_id) not in key for call in r2_deletes for key in call)


def test_idol_photo_avatars_are_never_deleted(client, db_conn, monkeypatch, purge_key, r2_deletes):
    user_id, auth = register(client, "idolpic")
    set_avatar(db_conn, user_id, "/images/idols/karina.webp")
    request_deletion(client, auth)
    on_day(monkeypatch, 15)
    purge(client)
    assert r2_deletes == [[f"avatars/{user_id}.webp"]]


def test_purge_skips_avatars_without_r2(client, db_conn, monkeypatch, purge_key, caplog):
    import logging

    from utils.r2 import R2Client

    for name in R2_SETTINGS:
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setattr(R2Client, "delete_files", lambda self, keys: pytest.fail("R2 must not be called"))
    user_id, auth = register(client, "local")
    request_deletion(client, auth)
    on_day(monkeypatch, 15)
    with caplog.at_level(logging.INFO, logger="services.account_deletion_service"):
        assert purge(client).get_json()["purged"] == 1
    assert "Avatar bucket not configured" in caplog.text
    assert requested_at(db_conn, user_id) == "gone"


def test_storage_failure_still_purges_the_account(client, db_conn, monkeypatch, purge_key, caplog):
    from utils.r2 import R2Client

    for name, value in R2_SETTINGS.items():
        monkeypatch.setenv(name, value)
    monkeypatch.setattr(R2Client, "__init__", lambda self: None)

    def unreachable(self, keys):
        raise ConnectionError("bucket down")

    monkeypatch.setattr(R2Client, "delete_files", unreachable)
    user_id, auth = register(client, "unlucky")
    request_deletion(client, auth)
    on_day(monkeypatch, 15)
    assert purge(client).get_json()["purged"] == 1
    assert requested_at(db_conn, user_id) == "gone"
    assert "Could not delete avatar files" in caplog.text
