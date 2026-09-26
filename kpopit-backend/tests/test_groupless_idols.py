"""
Groupless idols: an idol with 0 active career rows falls back to her most recent
past group as the "current group" read, flagged via `is_former_group`
(see grouplessidols.md). `is_active` itself is never touched.
"""

import pytest

from repositories.idol_repository import IdolRepository


@pytest.fixture
def repo(db_conn):
    with db_conn.cursor() as cur:
        yield IdolRepository(cur)


@pytest.fixture
def ex_member(db_conn, make_idol, make_group, make_career):
    """Idol who left two groups (older one first) and has no active group."""
    old_group = make_group("cignature", member_count=7, fandom_name="Cignals")
    latest_group = make_group("LATENCY", member_count=5, fandom_name="LTC")
    idol_id = make_idol("Haeun")
    make_career(idol_id, old_group, is_active=False, start_year=2020, end_year=2023)
    make_career(idol_id, latest_group, is_active=False, start_year=2024, end_year=2026)
    with db_conn.cursor() as cur:
        cur.execute("INSERT INTO companies (name) VALUES ('LATENCY Label') RETURNING id")
        company_id = cur.fetchone()["id"]
        cur.execute(
            "INSERT INTO group_company_affiliation (group_id, company_id, role) VALUES (%s, %s, 'Label')",
            (latest_group, company_id),
        )
    db_conn.commit()
    return {"idol_id": idol_id, "old_group": old_group, "latest_group": latest_group}


def test_repo_falls_back_to_most_recent_past_group(repo, ex_member):
    row = repo.fetch_full_idol_data(ex_member["idol_id"])

    assert row["group_id"] == ex_member["latest_group"]
    assert row["group_name"] == "LATENCY"
    assert row["member_count"] == 5
    assert row["is_former_group"] is True


def test_repo_prefers_active_group_over_newer_past_group(repo, make_idol, make_group, make_career):
    active = make_group("ActiveGroup")
    past = make_group("PastGroup")
    idol_id = make_idol("Mover")
    make_career(idol_id, active, is_active=True, start_year=2018)
    make_career(idol_id, past, is_active=False, start_year=2022, end_year=2025)

    row = repo.fetch_full_idol_data(idol_id)

    assert row["group_name"] == "ActiveGroup"
    assert row["is_former_group"] is False


def test_repo_multi_active_idol_keeps_lowest_group_id(repo, make_idol, make_group, make_career):
    first = make_group("FirstGroup")
    second = make_group("SecondGroup")
    idol_id = make_idol("Double")
    # Insert the higher group id first so row order can't fake a pass.
    make_career(idol_id, second, is_active=True, start_year=2023)
    make_career(idol_id, first, is_active=True, start_year=2019)

    row = repo.fetch_full_idol_data(idol_id)

    assert row["group_id"] == first
    assert row["is_former_group"] is False


def test_repo_idol_without_career_has_no_group(repo, make_idol):
    idol_id = make_idol("Nobody")

    row = repo.fetch_full_idol_data(idol_id)

    assert row["group_id"] is None
    assert row["is_former_group"] is False


def test_idols_page_list_flags_former_group(client, ex_member):
    resp = client.get("/api/idols-page")

    assert resp.status_code == 200
    idol = next(i for i in resp.get_json() if i["id"] == ex_member["idol_id"])
    assert idol["group_name"] == "LATENCY"
    assert idol["is_former_group"] is True
    assert idol["company_name"] == "LATENCY Label"


def test_idols_page_profile_flags_former_group(client, ex_member):
    resp = client.get(f"/api/idols-page/{ex_member['idol_id']}")

    assert resp.status_code == 200
    career = resp.get_json()["idol_career"]
    assert career["group_name"] == "LATENCY"
    assert career["is_former_group"] is True
    assert career["fandom_name"] == "LTC"
    assert [c["name"] for c in career["group_companies"]] == ["LATENCY Label"]
    # Current/Past history is read separately and stays truthful.
    assert all(not stint["is_active"] for stint in career["idol_career"])


def test_classic_daily_hints_use_former_group(client, db_conn, today, ex_member):
    with db_conn.cursor() as cur:
        cur.execute(
            "INSERT INTO daily_picks (pick_date, idol_id, gamemode_id) VALUES (%s, %s, 1)",
            (today, ex_member["idol_id"]),
        )
    db_conn.commit()

    resp = client.get("/api/game/classic/daily-idol")

    assert resp.status_code == 200
    data = resp.get_json()
    assert data["groups"] == ["LATENCY"]
    assert data["is_former_group"] is True
    assert data["member_count"] == 5


def test_classic_guess_compares_former_group_label(client, db_conn, today, make_user,
                                                   ex_member, make_idol, make_career):
    # A current LATENCY member shares the label with the answer (an ex-member).
    member_id = make_idol("HyunJin")
    make_career(member_id, ex_member["latest_group"], is_active=True, start_year=2024)
    _, token = make_user()
    with db_conn.cursor() as cur:
        # Every real idol has a position; the guess comparison iterates it.
        cur.execute("UPDATE idols SET position = 'Vocalist'")
        cur.execute(
            "INSERT INTO daily_picks (pick_date, idol_id, gamemode_id) VALUES (%s, %s, 1)",
            (today, ex_member["idol_id"]),
        )
    db_conn.commit()

    resp = client.post(
        "/api/game/classic/guess",
        json={"guessed_idol_id": member_id, "answer_id": ex_member["idol_id"],
              "current_attempt": 1, "game_date": today},
        headers={"Authorization": token},
    )

    assert resp.status_code == 200, resp.get_json()
    assert resp.get_json()["feedback"]["companies"]["status"] == "correct"
