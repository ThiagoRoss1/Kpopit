"""Auth hardening: refresh errors, enumeration timing on forgot-password / register / claim."""

import time
from contextlib import contextmanager

import pytest

from services import auth_service as auth_service_module
from services.email_service import EmailService
from routes import email as email_routes

PASSWORD = "password123"


def register(client, username, email=None):
    return client.post("/api/auth/register", json={"username": username, "password": PASSWORD, "email": email})


def refresh_cookie_headers(res):
    return [h for h in res.headers.getlist("Set-Cookie") if h.startswith("refresh_token=")]


# --- refresh -----------------------------------------------------------------

def test_refresh_server_error_keeps_the_cookie(client, monkeypatch):
    assert register(client, "keepme").status_code == 201

    def boom(self, cursor, raw):
        raise RuntimeError("db hiccup")

    monkeypatch.setattr(auth_service_module.AuthService, "refresh_access_token", boom)
    res = client.post("/api/auth/refresh")
    assert res.status_code == 500
    assert refresh_cookie_headers(res) == []

    monkeypatch.undo()
    assert client.post("/api/auth/refresh").status_code == 200


def test_rejected_refresh_token_clears_the_cookie(client):
    client.set_cookie("refresh_token", "forged")
    res = client.post("/api/auth/refresh")
    assert res.status_code == 401
    [cleared] = refresh_cookie_headers(res)
    assert "Max-Age=0" in cleared or "expires=Thu, 01 Jan 1970" in cleared


# --- forgot-password ---------------------------------------------------------

def test_forgot_password_same_answer_and_speed_for_any_email(client, email_outbox, monkeypatch):
    assert register(client, "forgetful", "forgetful@example.com").status_code == 201
    real_send = EmailService.send_password_reset

    def slow_send(*args, **kwargs):
        time.sleep(0.8)  # a slow Resend call must not show in the response time
        return real_send(*args, **kwargs)

    monkeypatch.setattr(EmailService, "send_password_reset", staticmethod(slow_send))

    timings, bodies = {}, {}
    for email in ("forgetful@example.com", "nobody@example.com"):
        start = time.perf_counter()
        res = client.post("/api/auth/email/forgot-password", json={"email": email})
        timings[email] = time.perf_counter() - start
        bodies[email] = (res.status_code, res.get_json())

    assert bodies["forgetful@example.com"] == bodies["nobody@example.com"]
    assert bodies["nobody@example.com"][0] == 200
    assert max(timings.values()) < 0.5, timings
    assert email_outbox.wait_for("forgetful@example.com") is not None
    assert email_outbox.wait_for("nobody@example.com", timeout=0.5) is None


def test_forgot_password_missing_email_is_400(client):
    assert client.post("/api/auth/email/forgot-password", json={}).status_code == 400


def test_reset_delivery_releases_database_first(client, monkeypatch):
    assert register(client, "release", "release@example.com").status_code == 201
    returned = []
    real_context = email_routes.get_manual_db

    @contextmanager
    def checkout():
        with real_context() as conn:
            yield conn
        returned.append(True)

    sent_after_release = []
    monkeypatch.setattr(email_routes, "get_manual_db", checkout)
    monkeypatch.setattr(EmailService, "send_password_reset", lambda **kwargs: sent_after_release.append(bool(returned)))
    email_routes._issue_password_reset("release@example.com")
    assert sent_after_release == [True]


def test_background_reset_rolls_back_before_returning_connection(client, monkeypatch):
    from psycopg.pq import TransactionStatus
    assert register(client, "rollback", "rollback@example.com").status_code == 201
    statuses = []
    real_context = email_routes.get_manual_db

    @contextmanager
    def checkout():
        with real_context() as conn:
            try:
                yield conn
            finally:
                statuses.append(conn.info.transaction_status)

    real_lookup = email_routes.UserRepository.find_by_email

    def missing_foreign_key(self, cursor, address):
        user = real_lookup(self, cursor, address)
        return {**user, "id": 999999999}

    monkeypatch.setattr(email_routes, "get_manual_db", checkout)
    monkeypatch.setattr(email_routes.UserRepository, "find_by_email", missing_foreign_key)
    email_routes._issue_password_reset("rollback@example.com")
    assert statuses == [TransactionStatus.IDLE]


@pytest.mark.parametrize("address", [["user@example.com"], {"email": "user@example.com"}, "x" * 10000],
                         ids=["list", "object", "too-long"])
def test_forgot_password_rejects_malformed_email(client, address):
    assert client.post("/api/auth/email/forgot-password", json={"email": address}).status_code == 400


def test_reset_queue_is_bounded_and_frees_capacity(client, monkeypatch):
    from concurrent.futures import Future
    from threading import BoundedSemaphore
    futures = []

    def schedule(*args):
        future = Future()
        futures.append(future)
        return future

    monkeypatch.setattr(email_routes, "_background_slots", BoundedSemaphore(1), raising=False)
    monkeypatch.setattr(email_routes._background, "submit", schedule)
    assert client.post("/api/auth/email/forgot-password", json={"email": "one@example.com"}).status_code == 200
    assert client.post("/api/auth/email/forgot-password", json={"email": "two@example.com"}).status_code == 503
    futures[0].set_result(None)
    assert client.post("/api/auth/email/forgot-password", json={"email": "three@example.com"}).status_code == 200
    futures[-1].set_result(None)


# --- register / claim hash before the duplicate checks ------------------------

@pytest.fixture
def hash_calls(monkeypatch):
    calls = []
    real = auth_service_module.AuthService.hash_password

    def counting(self, password):
        calls.append(1)
        return real(self, password)

    monkeypatch.setattr(auth_service_module.AuthService, "hash_password", counting)
    return calls


def test_register_duplicate_email_still_pays_the_hash(client, hash_calls):
    assert register(client, "first", "dup@example.com").status_code == 201
    hash_calls.clear()

    res = register(client, "second", "dup@example.com")
    assert res.status_code == 409
    assert res.get_json() == {"error": "Email is already registered"}
    assert hash_calls == [1]


def test_register_duplicate_username_keeps_its_message(client, hash_calls):
    assert register(client, "taken").status_code == 201
    hash_calls.clear()
    res = register(client, "taken")
    assert res.get_json() == {"error": "Username is already taken"}
    assert hash_calls == [1]


def test_claim_duplicate_email_still_pays_the_hash(client, make_user, hash_calls):
    assert register(client, "owner", "owned@example.com").status_code == 201
    _, anon = make_user()
    hash_calls.clear()

    res = client.post(
        "/api/auth/claim",
        json={"username": "claimer", "password": PASSWORD, "email": "owned@example.com"},
        headers={"Authorization": anon},
    )
    assert res.status_code == 409
    assert hash_calls == [1]


def test_same_second_logins_get_separate_refresh_sessions(app, client, monkeypatch):
    from services import auth_service

    assert register(client, "twodevices").status_code == 201
    frozen = auth_service.utc_now()
    monkeypatch.setattr(auth_service, "utc_now", lambda: frozen)  # both logins in the same instant
    phone, laptop = app.test_client(), app.test_client()
    for device in (phone, laptop):
        assert device.post("/api/auth/login", json={"identifier": "twodevices", "password": PASSWORD}).status_code == 200
    monkeypatch.undo()

    phone.post("/api/auth/logout")
    assert phone.post("/api/auth/refresh").status_code == 401
    assert laptop.post("/api/auth/refresh").status_code == 200


# --- B8: password change ends the other sessions -------------------------------

def _login(app, username, password=PASSWORD):
    client = app.test_client()
    res = client.post("/api/auth/login", json={"identifier": username, "password": password})
    assert res.status_code == 200, res.get_json()
    return client, res.get_json()["access_token"]


def _change_password(client, access, current, new="brand-new-pass1"):
    return client.patch(
        "/api/user/change-password",
        json={"current_password": current, "new_password": new, "confirm_password": new},
        headers={"Authorization": f"Bearer {access}"},
    )


def test_password_change_revokes_other_sessions_and_keeps_this_one(app, client):
    assert register(client, "rotator").status_code == 201
    here, access = _login(app, "rotator")
    elsewhere, _ = _login(app, "rotator")

    res = _change_password(here, access, PASSWORD)
    assert res.status_code == 200, res.get_json()

    assert here.post("/api/auth/refresh").status_code == 200
    assert elsewhere.post("/api/auth/refresh").status_code == 401
    # The register session (a third device) is gone too.
    assert client.post("/api/auth/refresh").status_code == 401


def test_password_change_with_a_token_from_refresh_keeps_that_session(app, client):
    assert register(client, "refresher2").status_code == 201
    here, _ = _login(app, "refresher2")
    elsewhere, _ = _login(app, "refresher2")
    refreshed = here.post("/api/auth/refresh").get_json()["access_token"]

    assert _change_password(here, refreshed, PASSWORD).status_code == 200
    assert here.post("/api/auth/refresh").status_code == 200
    assert elsewhere.post("/api/auth/refresh").status_code == 401


def test_password_change_with_a_token_without_sid_revokes_every_session(app, client, db_conn, make_access_jwt):
    assert register(client, "legacytok").status_code == 201
    here, _ = _login(app, "legacytok")
    user_id = db_conn.execute("SELECT id, token FROM users WHERE username = 'legacytok'").fetchone()
    legacy_access = make_access_jwt(user_id["id"], user_id["token"], "legacytok")  # minted before `sid` existed

    assert _change_password(here, legacy_access, PASSWORD).status_code == 200
    assert here.post("/api/auth/refresh").status_code == 401


# --- B11: a wrong current password is 403, so the client never runs a refresh ----

@pytest.mark.parametrize(("method", "url", "body"), [
    ("patch", "/api/user/change-password",
     {"current_password": "wrong-password", "new_password": "brand-new-pass1", "confirm_password": "brand-new-pass1"}),
    ("patch", "/api/user/profile", {"username": "renamed1", "current_password": "wrong-password"}),
    ("patch", "/api/auth/email/request-email-change", {"new_email": "new@example.com", "current_password": "wrong-password"}),
])
def test_wrong_current_password_is_403_not_401(app, client, method, url, body):
    assert register(client, "pwcheck", "pwcheck@example.com").status_code == 201
    device, access = _login(app, "pwcheck")
    res = getattr(device, method)(url, json=body, headers={"Authorization": f"Bearer {access}"})
    assert res.status_code == 403
    assert res.get_json() == {"error": "Current password is incorrect"}
    # The session is untouched.
    assert device.post("/api/auth/refresh").status_code == 200
