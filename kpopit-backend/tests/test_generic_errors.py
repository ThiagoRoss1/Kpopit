"""T32: 500 responses carry a generic message; the exception text only reaches the logs."""

import logging

import pytest

from routes.games import blurry, classic
from routes.idols_page import idols_page
from routes import users
from utils.dates import get_today_date_str

SECRET = "relation secret_table does not exist at host db.internal"


class Boom:
    def __getattr__(self, _name):
        def _raise(*_a, **_k):
            raise RuntimeError(SECRET)
        return _raise


def assert_generic(res, caplog):
    assert res.status_code == 500
    assert SECRET not in res.get_data(as_text=True)
    assert "details" not in res.get_json()
    assert SECRET in caplog.text


@pytest.mark.parametrize(("module", "mode", "gm"), [(classic, "classic", 1), (blurry, "blurry", 2)])
def test_guess_route_hides_exception_text(client, make_user, monkeypatch, caplog, module, mode, gm):
    _, token = make_user()
    monkeypatch.setattr(module, "get_idol_repo", lambda: Boom())
    with caplog.at_level(logging.ERROR):
        res = client.post(
            f"/api/game/{mode}/guess?gamemode_id={gm}",
            json={"guessed_idol_id": 1, "answer_id": 1, "current_attempt": 1, "game_date": get_today_date_str()},
            headers={"Authorization": token},
        )
    assert_generic(res, caplog)
    assert res.get_json() == {"error": "Could not process the guess"}


def test_idols_page_hides_exception_text(client, monkeypatch, caplog):
    class BadConn:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def cursor(self):
            return BadCursor()

    class BadCursor(Boom):
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    monkeypatch.setattr(idols_page, "get_db", lambda: BadConn())
    with caplog.at_level(logging.ERROR):
        res = client.get("/api/idols-page")
    assert_generic(res, caplog)


def test_user_init_failure_has_no_details(client, monkeypatch, caplog):
    def no_db():
        raise RuntimeError(SECRET)

    monkeypatch.setattr(users, "get_db", no_db)
    with caplog.at_level(logging.ERROR):
        res = client.post("/api/user/init")
    assert_generic(res, caplog)
