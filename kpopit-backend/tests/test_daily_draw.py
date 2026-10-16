"""Daily draw (plan §3): one stateless draw for every mode, one day ahead."""

import random
import os
import threading
from collections import Counter
from datetime import timedelta

import psycopg
import pytest
from psycopg.rows import dict_row

from services import daily_draw
from services.daily_draw import (
    COOLDOWN_DAYS,
    NEVER_PICKED_WEIGHT,
    DrawItem,
    compute_weights,
    draw,
    ensure_daily_picks,
    ensure_pick,
    load_items,
)

from utils.dates import get_today_date


# ---------------------------------------------------------------------------
# Pure weights
# ---------------------------------------------------------------------------

def test_never_picked_gets_priority():
    n = 200
    items = [DrawItem(1, wait=20, never_picked=True)] + [
        DrawItem(i, wait=50, never_picked=False) for i in range(2, 11)
    ]
    pool, weights = compute_weights(items, n)
    by_id = dict(zip([i.item_id for i in pool], weights))
    assert by_id[1] == NEVER_PICKED_WEIGHT
    assert all(by_id[i] == pytest.approx(50 / n) for i in range(2, 11))

    rng = random.Random(1)
    wins = Counter(draw(items, n, rng) for _ in range(2000))
    # 3 vs 0.25 each: the never-picked item wins ~12x as often as any single old one
    assert wins[1] > 5 * max(wins[i] for i in range(2, 11))


def test_base_weight_is_capped_at_one():
    pool, weights = compute_weights([DrawItem(1, wait=40, never_picked=False)], n=20)
    # wait >= N makes the item late: base 1 times pressure (1 + 1 / 2)
    assert weights == [pytest.approx(1 * (1 + 1 / (0.10 * 20)))]


def test_pressure_multiplies_late_items_only():
    n = 100
    items = [
        DrawItem(1, wait=120, never_picked=False),   # late: wait >= N
        DrawItem(2, wait=70, never_picked=True),     # late: never picked, 60+ days in game
        DrawItem(3, wait=30, never_picked=True),     # not late
        DrawItem(4, wait=40, never_picked=False),    # not late
    ]
    pool, weights = compute_weights(items, n)
    pressure = 1 + 2 / (0.10 * n)
    assert weights == [
        pytest.approx(1.0 * pressure),
        pytest.approx(NEVER_PICKED_WEIGHT * pressure),
        pytest.approx(NEVER_PICKED_WEIGHT),
        pytest.approx(0.40),
    ]


@pytest.mark.parametrize("n", [50, 400])
def test_ultimatum_triggers_at_the_picked_deadline(n):
    deadline = max(365, n + 30)
    fresh = [DrawItem(i, wait=20, never_picked=True) for i in range(10, 20)]

    pool, _ = compute_weights(fresh + [DrawItem(1, wait=deadline - 1, never_picked=False)], n)
    assert len(pool) == 11

    pool, weights = compute_weights(fresh + [DrawItem(1, wait=deadline, never_picked=False)], n)
    assert [i.item_id for i in pool] == [1]
    assert weights == [float(deadline)]


@pytest.mark.parametrize("n", [50, 400])
def test_ultimatum_triggers_at_the_never_picked_deadline(n):
    deadline = max(300, n)
    others = [DrawItem(i, wait=20, never_picked=False) for i in range(10, 20)]
    items = others + [
        DrawItem(1, wait=deadline, never_picked=True),
        DrawItem(2, wait=deadline + 30, never_picked=True),
        DrawItem(3, wait=deadline - 1, never_picked=True),
    ]
    pool, weights = compute_weights(items, n)
    assert [i.item_id for i in pool] == [1, 2]
    assert weights == [float(deadline), float(deadline + 30)]


def test_cooldown_excludes_recent_picks():
    items = [DrawItem(1, wait=COOLDOWN_DAYS, never_picked=False), DrawItem(2, wait=COOLDOWN_DAYS + 1, never_picked=False)]
    rng = random.Random(3)
    assert {draw(items, 2, rng) for _ in range(200)} == {2}


# ---------------------------------------------------------------------------
# Against the DB
# ---------------------------------------------------------------------------

def _pick(db_conn, pick_date, gamemode_id):
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT idol_id, album_id FROM daily_picks WHERE pick_date = %s AND gamemode_id = %s",
            (pick_date, gamemode_id),
        )
        return cur.fetchone()


def _insert_pick(db_conn, pick_date, gamemode_id, idol_id=None, album_id=None):
    with db_conn.cursor() as cur:
        cur.execute(
            "INSERT INTO daily_picks (pick_date, idol_id, album_id, gamemode_id) VALUES (%s, %s, %s, %s)",
            (pick_date, idol_id, album_id, gamemode_id),
        )
    db_conn.commit()


def _set_release(db_conn, idol_id, release_date):
    with db_conn.cursor() as cur:
        cur.execute("UPDATE idols SET release_date = %s WHERE id = %s", (release_date, idol_id))
    db_conn.commit()


def _activate_blurry(db_conn, idol_id):
    with db_conn.cursor() as cur:
        cur.execute(
            "INSERT INTO blurry_mode_data (idol_id, blur_image_path, is_active) VALUES (%s, '/blur.webp', TRUE)",
            (idol_id,),
        )
    db_conn.commit()


def test_entry_date_used_for_never_picked_items(db_conn, make_idol, make_group, make_album):
    today = get_today_date()
    idol = make_idol("Entry Idol")
    _set_release(db_conn, idol, today - timedelta(days=100))
    album = make_album("Entry Album", make_group("G"))
    with db_conn.cursor() as cur:
        cur.execute("UPDATE albums SET created_at = %s WHERE id = %s", (today - timedelta(days=42), album))
    db_conn.commit()

    with db_conn.cursor() as cur:
        [idol_item] = load_items(cur, 1, today)
        [album_item] = load_items(cur, 3, today)
    assert idol_item == DrawItem(idol, wait=100, never_picked=True)
    assert album_item == DrawItem(album, wait=42, never_picked=True)


def test_wait_counts_from_last_pick_in_this_mode_only(db_conn, make_idol):
    today = get_today_date()
    idol = make_idol("Shared Idol")
    _set_release(db_conn, idol, today - timedelta(days=200))
    _activate_blurry(db_conn, idol)
    _insert_pick(db_conn, today - timedelta(days=3), 1, idol_id=idol)

    with db_conn.cursor() as cur:
        [classic] = load_items(cur, 1, today)
        [blurry] = load_items(cur, 2, today)
    assert classic == DrawItem(idol, wait=3, never_picked=False)
    assert blurry == DrawItem(idol, wait=200, never_picked=True)


def test_modes_are_independent(db_conn, make_idol):
    """Classic's cooldown on an idol never stops Blurry from picking it."""
    today = get_today_date()
    only = make_idol("Only Blurry Idol")
    other = make_idol("Classic Only")
    _activate_blurry(db_conn, only)
    _insert_pick(db_conn, today - timedelta(days=1), 1, idol_id=only)

    with db_conn.cursor() as cur:
        assert ensure_pick(cur, 2, today) == only
        classic = ensure_pick(cur, 1, today)
    db_conn.commit()
    assert classic == other


def test_cooldown_respected_against_daily_picks(db_conn, make_idol):
    today = get_today_date()
    recent = make_idol("Recent")
    rested = make_idol("Rested")
    _insert_pick(db_conn, today - timedelta(days=COOLDOWN_DAYS), 1, idol_id=recent)
    _insert_pick(db_conn, today - timedelta(days=COOLDOWN_DAYS + 5), 1, idol_id=rested)

    for seed in range(20):
        with db_conn.cursor() as cur:
            items = load_items(cur, 1, today)
        assert draw(items, len(items), random.Random(seed)) == rested


def test_last_picked_date_is_written_for_today_only(db_conn, make_idol):
    a, b = make_idol("A"), make_idol("B")
    today = get_today_date()
    with db_conn.cursor() as cur:
        today_id = ensure_daily_picks(cur, 1)
    db_conn.commit()

    tomorrow_id = _pick(db_conn, today + timedelta(days=1), 1)["idol_id"]
    assert {today_id, tomorrow_id} == {a, b}
    with db_conn.cursor() as cur:
        cur.execute("SELECT id, last_picked_date FROM idols")
        dates = {r["id"]: r["last_picked_date"] for r in cur.fetchall()}
    assert dates[today_id] == today
    assert dates[tomorrow_id] is None


def test_concurrent_draws_produce_one_pick(make_idol):
    for i in range(30):
        make_idol(f"Idol {i}")
    today = get_today_date()
    barrier = threading.Barrier(4)
    results, errors = [], []

    def worker(seed):
        try:
            with psycopg.connect(os.environ["DB_URL"], row_factory=dict_row) as conn, conn.cursor() as cur:
                barrier.wait()
                results.append(ensure_pick(cur, 1, today, random.Random(seed)))
                conn.commit()
        except Exception as e:  # pragma: no cover - surfaced below
            errors.append(e)

    threads = [threading.Thread(target=worker, args=(seed,)) for seed in range(4)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert not errors
    assert len(set(results)) == 1
    with psycopg.connect(os.environ["DB_URL"], row_factory=dict_row) as conn, conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS n FROM daily_picks WHERE pick_date = %s AND gamemode_id = 1", (today,))
        assert cur.fetchone()["n"] == 1


def test_tomorrow_pick_exists_but_no_route_returns_it(client, db_conn, make_idol, make_group, make_career, make_album):
    group = make_group("Route Group")
    for i in range(3):
        idol = make_idol(f"Route Idol {i}")
        make_career(idol, group)
        _activate_blurry(db_conn, idol)
    for i in range(3):
        make_album(f"Route Album {i}", group)

    today = get_today_date()
    tomorrow = today + timedelta(days=1)
    routes = {
        1: ("/api/game/classic/daily-idol?gamemode_id=1", "idol_id"),
        2: ("/api/game/blurry/daily-idol?gamemode_id=2", "idol_id"),
        3: ("/api/game/pixelated/daily-album?gamemode_id=3", "album_id"),
    }
    for gamemode_id, (url, column) in routes.items():
        res = client.get(url)
        assert res.status_code == 200, res.get_json()
        body = res.get_json()

        today_pick = _pick(db_conn, today, gamemode_id)[column]
        tomorrow_pick = _pick(db_conn, tomorrow, gamemode_id)
        assert tomorrow_pick is not None, f"mode {gamemode_id}: tomorrow was not drawn ahead"
        assert body["answer_id"] == today_pick
        assert body["server_date"] == today.isoformat()
        assert tomorrow.isoformat() not in res.get_data(as_text=True)

        # A second request reuses both picks instead of drawing again.
        client.get(url)
        assert _pick(db_conn, tomorrow, gamemode_id)[column] == tomorrow_pick[column]


def test_tomorrow_draw_failure_keeps_today(db_conn, make_idol, monkeypatch, caplog):
    make_idol("Solo")
    today = get_today_date()
    real = daily_draw.ensure_pick

    def flaky(cursor, gamemode_id, pick_date, rng=None):
        if pick_date > today:
            raise RuntimeError("Failing row contains future-answer-secret-8675309")
        return real(cursor, gamemode_id, pick_date, rng)

    monkeypatch.setattr(daily_draw, "ensure_pick", flaky)
    with db_conn.cursor() as cur:
        assert ensure_daily_picks(cur, 1) is not None
    db_conn.commit()
    assert _pick(db_conn, today, 1) is not None
    assert _pick(db_conn, today + timedelta(days=1), 1) is None
    assert "future-answer-secret-8675309" not in caplog.text
    assert "Could not draw tomorrow" in caplog.text
