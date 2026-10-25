"""Album 1 grants run once per win (user_id, date, gamemode_id): a failed grant never costs the win,
and the reconciliation (right after the failure and on the collections list) grants
the missing card exactly once, live and calendar wins alike."""

from datetime import datetime, timedelta, timezone

import pytest

from services.collections_service import CollectionService
from utils.dates import get_today_date

WON_AT = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)


def day(offset: int) -> str:
    return (get_today_date() + timedelta(days=offset)).isoformat()


@pytest.fixture(autouse=True)
def collection_on(monkeypatch):
    monkeypatch.setattr("services.game_service.COLLECTION_ENABLED", True)


@pytest.fixture
def pick(db_conn):
    def _pick(idol_id, offset, gamemode_id=1):
        with db_conn.cursor() as cur:
            cur.execute(
                "INSERT INTO daily_picks (pick_date, idol_id, gamemode_id) VALUES (%s, %s, %s) "
                "ON CONFLICT (pick_date, gamemode_id) DO UPDATE SET idol_id = EXCLUDED.idol_id",
                (day(offset), idol_id, gamemode_id),
            )
        db_conn.commit()

    return _pick


@pytest.fixture
def failing_grant(monkeypatch):
    """Make grant_card_for_win raise for the next `times` calls (every call by default)."""
    real = CollectionService.grant_card_for_win
    state = {"left": None}

    def _flaky(self, *args, **kwargs):
        if state["left"] is None or state["left"] > 0:
            if state["left"] is not None:
                state["left"] -= 1
            raise RuntimeError("card storage down")
        return real(self, *args, **kwargs)

    def _arm(times=None):
        state["left"] = times
        monkeypatch.setattr(CollectionService, "grant_card_for_win", _flaky)

    def _disarm():
        monkeypatch.setattr(CollectionService, "grant_card_for_win", real)

    _arm.disarm = _disarm
    return _arm


def win(db_conn, user_id, idol_id, offset=0, gamemode_id=1):
    """Win `day(offset)` through save_user_history (a past day is a calendar game)."""
    from services.game_service import GameService

    with db_conn.cursor() as cur:
        return GameService(db_conn, None).save_user_history(
            db_conn, cur, user_id, gamemode_id, idol_id, {}, idol_id, day(offset), WON_AT, {},
            is_calendar=offset != 0,
        )


def reconcile(db_conn, user_id=None):
    with db_conn.cursor() as cur:
        granted = CollectionService(db_conn).reconcile_cards(cur, user_id)
    db_conn.commit()
    return granted


def user_card(db_conn, user_id, card_id):
    with db_conn.cursor() as cur:
        cur.execute("SELECT level, times_won FROM user_cards WHERE user_id = %s AND card_id = %s",
                    (user_id, card_id))
        return cur.fetchone()


def history(db_conn, user_id, offset=0, gamemode_id=1):
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT won, is_calendar, card_granted_at FROM daily_user_history "
            "WHERE user_id = %s AND date = %s AND gamemode_id = %s",
            (user_id, day(offset), gamemode_id),
        )
        return cur.fetchone()


def test_failed_grant_keeps_the_win_and_reconciliation_grants_it_once(db_conn, make_user, collection_page,
                                                                      pick, failing_grant):
    user_id, _ = make_user()
    page = collection_page(n_members=2)
    idol_id, card_id = page["idol_ids"][0], page["card_ids"][0]
    pick(idol_id, 0)

    failing_grant()  # the grant and its immediate retry both fail
    assert win(db_conn, user_id, idol_id) == (True, None)
    row = history(db_conn, user_id)
    assert row["won"] is True and row["card_granted_at"] is None
    assert user_card(db_conn, user_id, card_id) is None

    failing_grant.disarm()
    granted = reconcile(db_conn)
    assert [g["card_granted"]["card_id"] for g in granted] == [card_id]
    assert user_card(db_conn, user_id, card_id) == {"level": 1, "times_won": 1}
    assert history(db_conn, user_id)["card_granted_at"] is not None

    assert reconcile(db_conn) == []
    assert reconcile(db_conn, user_id) == []
    assert user_card(db_conn, user_id, card_id) == {"level": 1, "times_won": 1}


def test_immediate_retry_grants_and_surfaces_the_card(db_conn, make_user, collection_page, pick, failing_grant):
    user_id, _ = make_user()
    page = collection_page(n_members=2)
    pick(page["idol_ids"][0], 0)

    failing_grant(times=1)  # only the first attempt fails
    is_correct, card_granted = win(db_conn, user_id, page["idol_ids"][0])
    assert is_correct is True
    assert card_granted["card_id"] == page["card_ids"][0] and card_granted["is_new"] is True
    assert user_card(db_conn, user_id, page["card_ids"][0]) == {"level": 1, "times_won": 1}
    assert reconcile(db_conn) == []


def test_reconciliation_twice_changes_nothing(db_conn, make_user, collection_page, pick):
    user_id, _ = make_user()
    page = collection_page(n_members=2)
    pick(page["idol_ids"][0], 0)
    win(db_conn, user_id, page["idol_ids"][0])

    assert reconcile(db_conn) == []
    assert reconcile(db_conn) == []
    assert user_card(db_conn, user_id, page["card_ids"][0]) == {"level": 1, "times_won": 1}


def test_duplicate_card_level_is_never_applied_twice(db_conn, make_user, collection_page, pick, failing_grant):
    user_id, _ = make_user()
    page = collection_page(n_members=2)
    idol_id, card_id = page["idol_ids"][0], page["card_ids"][0]
    pick(idol_id, -1)
    pick(idol_id, 0)
    win(db_conn, user_id, idol_id, offset=-1)
    assert user_card(db_conn, user_id, card_id) == {"level": 1, "times_won": 1}

    failing_grant()
    win(db_conn, user_id, idol_id)
    failing_grant.disarm()
    assert user_card(db_conn, user_id, card_id) == {"level": 1, "times_won": 1}

    reconcile(db_conn)
    reconcile(db_conn, user_id)
    assert user_card(db_conn, user_id, card_id) == {"level": 2, "times_won": 2}

    # Granting a win again directly is a no-op too.
    with db_conn.cursor() as cur:
        assert CollectionService(db_conn).grant_for_win(cur, user_id, 1, day(0), idol_id, WON_AT) is None
    db_conn.commit()
    assert user_card(db_conn, user_id, card_id) == {"level": 2, "times_won": 2}


def test_calendar_wins_are_reconciled(db_conn, make_user, collection_page, pick, failing_grant):
    user_id, _ = make_user()
    page = collection_page(n_members=2)
    pick(page["idol_ids"][1], -3, gamemode_id=2)

    failing_grant()
    assert win(db_conn, user_id, page["idol_ids"][1], offset=-3, gamemode_id=2) == (True, None)
    failing_grant.disarm()
    assert history(db_conn, user_id, -3, 2)["is_calendar"] is True

    granted = reconcile(db_conn, user_id)
    assert [(g["date"].isoformat(), g["gamemode_id"]) for g in granted] == [(day(-3), 2)]
    assert user_card(db_conn, user_id, page["card_ids"][1]) == {"level": 1, "times_won": 1}


def test_pixelated_and_lost_games_are_never_reconciled(db_conn, make_user, collection_page, pick):
    user_id, _ = make_user()
    page = collection_page(n_members=2)
    pick(page["idol_ids"][0], 0)
    with db_conn.cursor() as cur:
        cur.execute(
            "INSERT INTO daily_user_history (user_id, date, gamemode_id, guesses_count, won) VALUES (%s, %s, 1, 3, FALSE)",
            (user_id, day(0)),
        )
    db_conn.commit()
    assert reconcile(db_conn) == []
    assert user_card(db_conn, user_id, page["card_ids"][0]) is None


def test_collections_list_reconciles_the_viewer(client, db_conn, make_user, collection_page, pick, failing_grant):
    user_id, token = make_user()
    other_id, _ = make_user()
    page = collection_page(n_members=2)
    pick(page["idol_ids"][0], 0)

    failing_grant()
    win(db_conn, user_id, page["idol_ids"][0])
    win(db_conn, other_id, page["idol_ids"][0])
    failing_grant.disarm()

    res = client.get("/api/collections/list", headers={"Authorization": token})
    assert res.status_code == 200
    assert res.get_json()[0]["owned_cards"] == 1
    assert user_card(db_conn, user_id, page["card_ids"][0]) == {"level": 1, "times_won": 1}
    # Only the viewer is reconciled here; the other user is settled on their own list load.
    assert user_card(db_conn, other_id, page["card_ids"][0]) is None

