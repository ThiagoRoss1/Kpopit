"""T31 auth hardening: refresh errors, enumeration timing on forgot-password / register / claim."""

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

