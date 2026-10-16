"""
Admin routes are guarded by @require_admin (JWT with is_admin) and only exist
when ADMIN_ENABLED=true.
"""

import os
import subprocess
import sys
from datetime import timedelta
from pathlib import Path

import jwt as pyjwt
import pytest

from utils.dates import utc_now

BACKEND_ROOT = Path(__file__).resolve().parent.parent

ADMIN_ROUTES = [("POST", "/api/admin/add-idol")]


def _admin_jwt(user_id: int, token: str) -> str:
    now = utc_now()
    payload = {
        "sub": token,
        "user_id": user_id,
        "username": "adminuser",
        "is_admin": True,
        "is_authenticated": True,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(hours=1),
    }
    return pyjwt.encode(payload, os.environ["JWT_SECRET_KEY"], algorithm="HS256")


def _call(client, method, path, headers=None):
    body = {"artist_name": "Admin Test Idol", "gender": "F", "nationality": ["South Korea"], "position": ["Vocalist"]}
    return client.open(path, method=method, json=body, headers=headers or {})


@pytest.mark.parametrize("method,path", ADMIN_ROUTES)
def test_admin_route_requires_a_token(client, method, path):
    assert _call(client, method, path).status_code == 401


@pytest.mark.parametrize("method,path", ADMIN_ROUTES)
def test_admin_route_rejects_an_anonymous_uuid(client, make_user, method, path):
    _, token = make_user()
    assert _call(client, method, path, {"Authorization": token}).status_code == 401


@pytest.mark.parametrize("method,path", ADMIN_ROUTES)
def test_admin_route_rejects_a_normal_user(client, make_user, make_access_jwt, method, path):
    user_id, token = make_user()
    headers = {"Authorization": f"Bearer {make_access_jwt(user_id, token)}"}
    assert _call(client, method, path, headers).status_code == 403


def test_every_registered_admin_route_requires_a_token(app, client):
    # Catches a future admin route added without @require_admin.
    rules = [r for r in app.url_map.iter_rules() if r.rule.startswith("/api/admin")]
    assert {(m, r.rule) for r in rules for m in r.methods - {"HEAD", "OPTIONS"}} == set(ADMIN_ROUTES)
    for rule in rules:
        for method in rule.methods - {"HEAD", "OPTIONS"}:
            assert _call(client, method, rule.rule).status_code == 401, rule.rule


def test_admin_can_add_an_idol(client, make_user, db_conn):
    user_id, token = make_user()
    headers = {"Authorization": f"Bearer {_admin_jwt(user_id, token)}"}
    res = _call(client, "POST", "/api/admin/add-idol", headers)
    assert res.status_code == 201
    with db_conn.cursor() as cur:
        cur.execute("SELECT 1 FROM idols WHERE artist_name = 'Admin Test Idol'")
        assert cur.fetchone() is not None


def test_admin_routes_do_not_exist_when_disabled():
    # app.py reads ADMIN_ENABLED at import time, so check a fresh interpreter.
    env = {**os.environ, "ADMIN_ENABLED": "false"}
    code = (
        "from app import app; "
        "print(sorted(r.rule for r in app.url_map.iter_rules() if r.rule.startswith('/api/admin')))"
    )
    out = subprocess.run(
        [sys.executable, "-c", code], cwd=BACKEND_ROOT, env=env, capture_output=True, text=True, check=True,
    )
    assert out.stdout.strip().splitlines()[-1] == "[]"
