"""Integration tests for the Album 1 collection system.

Covers CollectionService grant paths, group_photo unlocks, read shapes, the
save_user_history hook (through the real guess flow), and the two collection
routes. The flag-off *blueprint* state is not testable in-process (registration
happens at app import) — the off-state is covered at the hook level instead.
"""

from datetime import datetime, timezone

from services.collections_service import CollectionService

WON_AT = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)


def grant(db_conn, user_id, idol_id, won_at=WON_AT):
    """Run grant_card_for_win on the shared test connection and commit."""
    service = CollectionService(db_conn)
    with db_conn.cursor() as cur:
        result = service.grant_card_for_win(cur, user_id, idol_id, won_at)
    db_conn.commit()
    return result


def fetch_user_card(db_conn, user_id, card_id):
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT level, times_won, first_won_at FROM user_cards WHERE user_id = %s AND card_id = %s",
            (user_id, card_id),
        )
        return cur.fetchone()


def count_user_cards(db_conn, user_id=None):
    with db_conn.cursor() as cur:
        if user_id is None:
            cur.execute("SELECT COUNT(*) AS n FROM user_cards")
        else:
            cur.execute("SELECT COUNT(*) AS n FROM user_cards WHERE user_id = %s", (user_id,))
        return cur.fetchone()["n"]


# ---------------------------------------------------------------------------
# CollectionService — grant paths (T4–T7)
# ---------------------------------------------------------------------------

def test_grant_new_card_level_1(db_conn, make_user, collection_page):
    user_id, _ = make_user()
    page = collection_page(n_members=2)

    result = grant(db_conn, user_id, page["idol_ids"][0])

    assert result["is_new"] is True
    assert result["level"] == 1
    assert result["times_won"] == 1
    assert result["card_id"] == page["card_ids"][0]
    row = fetch_user_card(db_conn, user_id, page["card_ids"][0])
    assert row["level"] == 1
    assert row["times_won"] == 1
    assert row["first_won_at"] == WON_AT


def test_grant_repeat_win_levels_up(db_conn, make_user, collection_page):
    user_id, _ = make_user()
    page = collection_page(n_members=2)
    idol_id = page["idol_ids"][0]

    grant(db_conn, user_id, idol_id)
    later = datetime(2026, 1, 2, 12, 0, tzinfo=timezone.utc)
    result = grant(db_conn, user_id, idol_id, won_at=later)

    assert result["is_new"] is False
    assert result["level"] == 2
    assert result["times_won"] == 2
    row = fetch_user_card(db_conn, user_id, page["card_ids"][0])
    assert row["level"] == 2
    assert row["times_won"] == 2
    # first_won_at must keep the original timestamp.
    assert row["first_won_at"] == WON_AT


def test_grant_capped_level_but_times_won_keeps_counting(db_conn, make_user, collection_page):
    user_id, _ = make_user()
    page = collection_page(n_members=2)
    idol_id = page["idol_ids"][0]

    for _ in range(5):
        result = grant(db_conn, user_id, idol_id)

    assert result["level"] == CollectionService.LEVEL_CAP == 3
    assert result["times_won"] == 5
    row = fetch_user_card(db_conn, user_id, page["card_ids"][0])
    assert row["level"] == 3
    assert row["times_won"] == 5


def test_grant_idol_without_card_row_is_noop(db_conn, make_user, make_idol):
    user_id, _ = make_user()
    idol_id = make_idol("Uncarded")

    assert grant(db_conn, user_id, idol_id) is None
    assert count_user_cards(db_conn) == 0


# ---------------------------------------------------------------------------
# CollectionService — group_photo unlock (T8–T13)
# ---------------------------------------------------------------------------

def test_completing_page_unlocks_group_photo(db_conn, make_user, collection_page):
    user_id, _ = make_user()
    page = collection_page(n_members=2)

    first = grant(db_conn, user_id, page["idol_ids"][0])
    assert first["group_photo"] == []

    second = grant(db_conn, user_id, page["idol_ids"][1])
    assert second["group_photo"] == [page["group_id"]]
    assert fetch_user_card(db_conn, user_id, page["group_photo_card_id"]) is not None


def test_one_win_completing_two_pages_unlocks_both(db_conn, make_user, collection_page, make_career):
    user_id, _ = make_user()
    page_a = collection_page("GroupA", n_members=2)
    page_b = collection_page("GroupB", n_members=2)
    # page_a's second idol also belongs to page_b (single card, two pages).
    shared_idol = page_a["idol_ids"][1]
    make_career(shared_idol, page_b["group_id"], is_active=False)

    grant(db_conn, user_id, page_a["idol_ids"][0])
    grant(db_conn, user_id, page_b["idol_ids"][0])
    grant(db_conn, user_id, page_b["idol_ids"][1])
    result = grant(db_conn, user_id, shared_idol)

    assert sorted(result["group_photo"]) == sorted([page_a["group_id"], page_b["group_id"]])
    assert fetch_user_card(db_conn, user_id, page_a["group_photo_card_id"]) is not None
    assert fetch_user_card(db_conn, user_id, page_b["group_photo_card_id"]) is not None


def test_group_photo_regrant_is_noop(db_conn, make_user, collection_page):
    user_id, _ = make_user()
    page = collection_page(n_members=1)

    first = grant(db_conn, user_id, page["idol_ids"][0])
    assert first["group_photo"] == [page["group_id"]]

    # Repeat win re-runs the completion check; the bonus must not re-grant.
    second = grant(db_conn, user_id, page["idol_ids"][0])
    assert second["group_photo"] == []
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) AS n FROM user_cards WHERE user_id = %s AND card_id = %s",
            (user_id, page["group_photo_card_id"]),
        )
        assert cur.fetchone()["n"] == 1


def test_no_bonus_cover_page_never_unlocks(db_conn, make_user, collection_page):
    user_id, _ = make_user()
    page = collection_page("Soloist-like", n_members=1, has_bonus_cover=False)

    result = grant(db_conn, user_id, page["idol_ids"][0])

    assert result["group_photo"] == []
    assert count_user_cards(db_conn, user_id) == 1  # the idol card only


def test_missing_group_photo_card_row_is_silent(db_conn, make_user, collection_page):
    user_id, _ = make_user()
    page = collection_page(n_members=1, with_group_photo=False)

    result = grant(db_conn, user_id, page["idol_ids"][0])

    assert result["group_photo"] == []
    assert count_user_cards(db_conn, user_id) == 1


def test_multi_group_idol_does_not_inflate_completion(db_conn, make_user, collection_page, make_career):
    """An idol on two pages counts once per page; owning her card must not
    complete a page that still has unowned members."""
    user_id, _ = make_user()
    page_a = collection_page("GroupA", n_members=1)
    page_b = collection_page("GroupB", n_members=2)
    make_career(page_a["idol_ids"][0], page_b["group_id"], is_active=False)

    result = grant(db_conn, user_id, page_a["idol_ids"][0])

    # Page A (1 member) completes; page B still misses two other members.
    assert result["group_photo"] == [page_a["group_id"]]


# ---------------------------------------------------------------------------
# CollectionService — album fallbacks (migrated from the deleted get_group_page
# tests; the fallback chain now lives in get_album)
# ---------------------------------------------------------------------------

def test_album_member_image_and_no_bonus_fallbacks(db_conn, make_user, make_eligible_group,
                                                   make_idol, make_career, make_card,
                                                   collection_page):
    user_id, _ = make_user()
    group_id = make_eligible_group("TWICE-ish")
    idol_id = make_idol("Sana-ish", image_path="idols/sana.webp")
    make_career(idol_id, group_id)
    make_card(idol_id=idol_id)  # card art NULL → idol fallback
    no_bonus = collection_page("Soloist-like", n_members=1, has_bonus_cover=False)

    service = CollectionService(db_conn)
    with db_conn.cursor() as cur:
        album = {g["group_id"]: g for g in service.get_album(cur, user_id)}

    member = album[group_id]["members"][0]
    assert member["image_path"] == "idols/sana.webp"  # COALESCE → idols.image_path
    assert member["owned"] is False
    assert member["level"] is None
    assert album[group_id]["group_photo"] is None  # no group_photo card row
    assert album[no_bonus["group_id"]]["group_photo"] is None  # no-bonus page


# ---------------------------------------------------------------------------
# Hook — through the real guess flow (T17–T20)
# ---------------------------------------------------------------------------

def _blurry_guess(client, token, idol_id, today, attempt=1):
    return client.post(
        "/api/game/blurry/guess?gamemode_id=2",
        json={
            "guessed_idol_id": idol_id,
            "answer_id": idol_id,
            "current_attempt": attempt,
            "game_date": today,
        },
        headers={"Authorization": token},
    )


def test_blurry_win_grants_card_and_surfaces_card_granted(client, db_conn, make_user,
                                                          collection_page, today, monkeypatch):
    monkeypatch.setattr("services.game_service.COLLECTION_ENABLED", True)
    user_id, token = make_user()
    page = collection_page(n_members=2)

    resp = _blurry_guess(client, token, page["idol_ids"][0], today)
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["guess_correct"] is True
    assert body["card_granted"] == {
        "card_id": page["card_ids"][0],
        "is_new": True,
        "level": 1,
        "times_won": 1,
        "group_photo": [],
    }
    assert fetch_user_card(db_conn, user_id, page["card_ids"][0])["level"] == 1

    # Same-day repeat win: no re-grant, card_granted is null.
    resp2 = _blurry_guess(client, token, page["idol_ids"][0], today, attempt=2)
    assert resp2.status_code == 200
    assert resp2.get_json()["card_granted"] is None
    assert fetch_user_card(db_conn, user_id, page["card_ids"][0])["times_won"] == 1


def test_classic_win_grants_via_service(db_conn, make_user, collection_page, today, monkeypatch):
    """Gamemode 1 goes through the same save_user_history hook (service level —
    the classic HTTP route needs the full attribute-feedback fixture set)."""
    monkeypatch.setattr("services.game_service.COLLECTION_ENABLED", True)
    from services.game_service import GameService

    user_id, _ = make_user()
    page = collection_page(n_members=2)
    idol_id = page["idol_ids"][0]

    game_service = GameService(db_conn, None)
    with db_conn.cursor() as cur:
        is_correct, card_granted = game_service.save_user_history(
            db_conn, cur, user_id, 1, idol_id, {"artist_name": "X"},
            idol_id, 1, today, WON_AT, {},
        )
    assert is_correct is True
    assert card_granted["card_id"] == page["card_ids"][0]
    assert card_granted["is_new"] is True
    assert fetch_user_card(db_conn, user_id, page["card_ids"][0]) is not None


def test_pixelated_win_grants_nothing(client, db_conn, make_user, make_group, make_album,
                                      set_daily_pick, today, monkeypatch):
    monkeypatch.setattr("services.game_service.COLLECTION_ENABLED", True)
    user_id, token = make_user()
    gid = make_group("Pixie")
    aid = make_album("Cosmic Dream", gid)
    set_daily_pick(aid, 3)

    resp = client.post(
        "/api/game/pixelated/guess?gamemode_id=3",
        json={"album_id": aid, "current_attempt": 1, "game_date": today},
        headers={"Authorization": token},
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["guess_correct"] is True
    # Pixelated's response shape is unchanged — no card_granted field at all.
    assert "card_granted" not in body
    assert count_user_cards(db_conn, user_id) == 0


def test_flag_off_win_recorded_but_no_grant(client, db_conn, make_user, collection_page,
                                            today, monkeypatch):
    monkeypatch.setattr("services.game_service.COLLECTION_ENABLED", False)
    user_id, token = make_user()
    page = collection_page(n_members=2)

    resp = _blurry_guess(client, token, page["idol_ids"][0], today)
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["guess_correct"] is True
    assert body["card_granted"] is None
    assert count_user_cards(db_conn, user_id) == 0
    with db_conn.cursor() as cur:
        cur.execute(
            "SELECT won FROM daily_user_history WHERE user_id = %s AND date = %s AND gamemode_id = 2",
            (user_id, today),
        )
        assert cur.fetchone()["won"] is True


def test_losing_guess_grants_nothing(client, db_conn, make_user, collection_page, make_idol,
                                     make_career, make_card, today, monkeypatch):
    monkeypatch.setattr("services.game_service.COLLECTION_ENABLED", True)
    user_id, token = make_user()
    page = collection_page(n_members=2)
    wrong_idol = make_idol("Wrong Guess")
    make_career(wrong_idol, page["group_id"])
    make_card(idol_id=wrong_idol)

    resp = client.post(
        "/api/game/blurry/guess?gamemode_id=2",
        json={
            "guessed_idol_id": wrong_idol,
            "answer_id": page["idol_ids"][0],
            "current_attempt": 1,
            "game_date": today,
        },
        headers={"Authorization": token},
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["guess_correct"] is False
    assert body["card_granted"] is None
    assert count_user_cards(db_conn, user_id) == 0


# ---------------------------------------------------------------------------
# Routes — /collections/list + /collections/album/<id> (auth scenarios migrated
# from the deleted overview/groups route tests)
# ---------------------------------------------------------------------------

def test_collections_list_shape_and_counts(client, db_conn, make_user, collection_page):
    user_id, token = make_user()
    page = collection_page(n_members=2)  # 2 idol cards + 1 group_photo card
    grant(db_conn, user_id, page["idol_ids"][0])

    resp = client.get("/api/collections/list", headers={"Authorization": token})
    assert resp.status_code == 200
    body = resp.get_json()
    assert len(body) == 1
    row = body[0]
    assert row["collection_id"] == 1
    assert row["name"] == "Album 1"
    assert row["total_cards"] == 3
    assert row["owned_cards"] == 1


def test_album_route_jwt_sees_ownership(client, db_conn, make_user, collection_page, make_access_jwt):
    user_id, token = make_user()
    page = collection_page(n_members=2)
    grant(db_conn, user_id, page["idol_ids"][0])

    jwt_token = make_access_jwt(user_id, token)
    resp = client.get("/api/collections/album/1", headers={"Authorization": f"Bearer {jwt_token}"})
    assert resp.status_code == 200
    assert sum(m["owned"] for m in resp.get_json()[0]["members"]) == 1


def test_list_and_album_routes_degrade_on_garbage_auth(client, db_conn, make_user, collection_page):
    owner_id, _ = make_user()
    page = collection_page(n_members=2)
    grant(db_conn, owner_id, page["idol_ids"][0])

    for headers in ({}, {"Authorization": "not-a-uuid-not-a-jwt"}):
        resp = client.get("/api/collections/list", headers=headers)
        assert resp.status_code == 200
        assert resp.get_json()[0]["owned_cards"] == 0

        resp = client.get("/api/collections/album/1", headers=headers)
        assert resp.status_code == 200
        assert sum(m["owned"] for m in resp.get_json()[0]["members"]) == 0


def test_album_param_route_and_404s_unknown(client, make_user, collection_page):
    _, token = make_user()
    collection_page(n_members=2)

    param = client.get("/api/collections/album/1", headers={"Authorization": token})
    assert param.status_code == 200

    assert client.get("/api/collections/album/999999").status_code == 404


# ---------------------------------------------------------------------------
# Bulk album payload (GET /api/collections/album/<id> → get_album)
# ---------------------------------------------------------------------------

def _seed_group_presentation(db_conn, group_id, image_path="groups/test.webp",
                             palette=None, label_company=None, parent_company=None):
    """Attach group_features + company affiliations to an existing group."""
    import json

    with db_conn.cursor() as cur:
        cur.execute(
            "INSERT INTO group_features (group_id, image_path, palette) VALUES (%s, %s, %s)",
            (group_id, image_path, json.dumps(palette) if palette else None),
        )
        for name, role in ((label_company, "Label"), (parent_company, "Parent Company")):
            if name is None:
                continue
            cur.execute(
                "INSERT INTO companies (name, is_published) VALUES (%s, TRUE) RETURNING id",
                (name,),
            )
            company_id = cur.fetchone()["id"]
            cur.execute(
                "INSERT INTO group_company_affiliation (group_id, company_id, role) VALUES (%s, %s, %s)",
                (group_id, company_id, role),
            )
    db_conn.commit()


def test_album_shape_presentation_and_ownership(db_conn, make_user, collection_page):
    user_id, _ = make_user()
    palette = {"deep": "#111111", "secondary": "#222222", "main": "#333333",
               "accent": "#444444", "light": "#555555"}
    page_a = collection_page("AlbumGroupA", n_members=2)
    page_b = collection_page("AlbumGroupB", n_members=1)
    _seed_group_presentation(db_conn, page_a["group_id"], palette=palette,
                             label_company="Source-ish Music", parent_company="HYBE-ish")
    _seed_group_presentation(db_conn, page_b["group_id"], image_path="groups/b.webp",
                             label_company="SM-ish")
    grant(db_conn, user_id, page_a["idol_ids"][0])

    service = CollectionService(db_conn)
    with db_conn.cursor() as cur:
        album = service.get_album(cur, user_id)

    assert [g["group_id"] for g in album] == sorted([page_a["group_id"], page_b["group_id"]])
    group_a = next(g for g in album if g["group_id"] == page_a["group_id"])
    assert group_a["group_name"] == "AlbumGroupA"
    assert group_a["debut_year"] == 2020
    assert group_a["fandom_name"] == "TestFans"
    assert group_a["palette"] == palette
    assert group_a["company"] == "Source-ish Music"
    assert group_a["label"] == "HYBE-ish"
    assert len(group_a["members"]) == 2
    owned = [m for m in group_a["members"] if m["owned"]]
    assert len(owned) == 1 and owned[0]["level"] == 1
    # group_photo card art is NULL → falls back to group_features.image_path
    assert group_a["group_photo"]["image_path"] == "groups/test.webp"
    assert group_a["group_photo"]["owned"] is False

    # No Parent Company affiliation → the label company doubles as the label
    group_b = next(g for g in album if g["group_id"] == page_b["group_id"])
    assert group_b["company"] == "SM-ish"
    assert group_b["label"] == "SM-ish"


def test_album_omits_ineligible_and_cardless_pages(db_conn, make_user, collection_page,
                                                   make_eligible_group, make_idol, make_career):
    user_id, _ = make_user()
    page = collection_page(n_members=1)
    make_eligible_group("NotEligible", is_eligible=False)
    cardless = make_eligible_group("EligibleButCardless")
    idol_id = make_idol("No Card Yet")
    make_career(idol_id, cardless)

    service = CollectionService(db_conn)
    with db_conn.cursor() as cur:
        album = service.get_album(cur, user_id)
    assert [g["group_id"] for g in album] == [page["group_id"]]


def test_album_route_anonymous_uuid_sees_ownership(client, db_conn, make_user, collection_page):
    user_id, token = make_user()
    page = collection_page(n_members=2)
    _seed_group_presentation(db_conn, page["group_id"])
    grant(db_conn, user_id, page["idol_ids"][0])

    resp = client.get("/api/collections/album/1", headers={"Authorization": token})
    assert resp.status_code == 200
    body = resp.get_json()
    assert len(body) == 1
    assert sum(m["owned"] for m in body[0]["members"]) == 1

    # Anonymous catalog view still returns the full album with zero ownership
    resp = client.get("/api/collections/album/1")
    assert resp.status_code == 200
    assert sum(m["owned"] for m in resp.get_json()[0]["members"]) == 0
