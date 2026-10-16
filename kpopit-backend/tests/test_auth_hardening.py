"""T31 auth hardening: refresh errors, enumeration timing on forgot-password / register / claim."""

from services import auth_service as auth_service_module

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
