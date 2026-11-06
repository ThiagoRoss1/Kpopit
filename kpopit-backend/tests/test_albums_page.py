"""GET /api/albums-page (list) and /api/albums-page/<id> (album page): published albums only."""


def _unpublish(db_conn, album_id):
    with db_conn.cursor() as cur:
        cur.execute("UPDATE albums SET is_published = FALSE WHERE id = %s", (album_id,))
    db_conn.commit()


def _set_release(db_conn, album_id, day, language="Korean", kind="Mini Album"):
    with db_conn.cursor() as cur:
        cur.execute("UPDATE albums SET release_date = %s, language = %s, type = %s WHERE id = %s", (day, language, kind, album_id))
    db_conn.commit()


def test_list_has_published_albums_with_artist_and_year_only(client, db_conn, make_group, make_album):
    group = make_group("IVE")
    shown = make_album("After LIKE", group)
    hidden = make_album("Unreleased", group)
    _unpublish(db_conn, hidden)
    rows = client.get("/api/albums-page").get_json()
    assert [r["id"] for r in rows] == [shown]
    row = rows[0]
    assert row["artist_name"] == "IVE" and row["release_year"] == 2020
    assert "release_date" not in row


def test_album_page_has_facts_and_the_artists_other_albums(client, db_conn, make_group, make_album):
    group = make_group("IVE", debut_year=2021, member_count=6, generation=4, fandom_name="DIVE")
    first = make_album("ELEVEN", group)
    current = make_album("After LIKE", group)
    later = make_album("I AM", group)
    unpublished = make_album("Demo", group)
    other_group = make_album("Other", make_group("aespa"))
    _set_release(db_conn, first, "2021-12-01")
    _set_release(db_conn, current, "2022-08-22", language="Japanese")
    _set_release(db_conn, later, "2023-04-10")
    _unpublish(db_conn, unpublished)

    body = client.get(f"/api/albums-page/{current}").get_json()
    assert body["name"] == "After LIKE" and body["release_date"] == "2022-08-22"
    assert body["type"] == "Mini Album" and body["language"] == "Japanese"
    assert body["artist"] == {
        "name": "IVE", "group_id": group, "soloist_id": None, "is_soloist": False, "hangul_name": None,
        "debut_year": 2021, "generation": 4, "member_count": 6, "fandom_name": "DIVE",
    }
    assert [d["id"] for d in body["discography"]] == [first, later]
    assert other_group not in [d["id"] for d in body["discography"]]


def test_solo_album_discography_is_the_soloists_own(client, make_soloist_album):
    mine, _ = make_soloist_album("Solo One", artist_name="Solo Star")
    second, _ = make_soloist_album("Solo Two", artist_name="Another Star")
    body = client.get(f"/api/albums-page/{mine}").get_json()
    assert body["artist"]["is_soloist"] is True and body["artist"]["name"] == "Solo Star"
    assert body["artist"]["member_count"] is None and body["artist"]["fandom_name"] is None
    assert second not in [d["id"] for d in body["discography"]]


def test_unknown_or_unpublished_album_is_404(client, db_conn, make_group, make_album):
    assert client.get("/api/albums-page/999999").status_code == 404
    hidden = make_album("Hidden", make_group())
    _unpublish(db_conn, hidden)
    assert client.get(f"/api/albums-page/{hidden}").status_code == 404
