"""A rename keeps the 5-day cooldown and the password check; the old name is reserved for
15 days (nobody else can take it, /profile/<old> redirects), then it is free again."""

from datetime import timedelta

from utils.dates import utc_now

PASSWORD = "password123"


def register(client, username):
    res = client.post("/api/auth/register", json={"username": username, "password": PASSWORD})
    assert res.status_code == 201, res.get_json()
    body = res.get_json()
    return body["user"]["user_id"], {"Authorization": f"Bearer {body['access_token']}"}


def rename(client, auth, username, password=PASSWORD):
    return client.patch("/api/user/profile", json={"username": username, "current_password": password}, headers=auth)


def shift(db_conn, user_id, days):
    """Move the user's rename and its reservations `days` into the past (fake dates)."""
    with db_conn.cursor() as cur:
        cur.execute("UPDATE users SET username_changed_at = username_changed_at - %s WHERE id = %s",
                    (timedelta(days=days), user_id))
        cur.execute("UPDATE username_reservations SET reserved_until = reserved_until - %s WHERE user_id = %s",
                    (timedelta(days=days), user_id))
    db_conn.commit()


def test_rename_needs_the_right_password(client):
    _, auth = register(client, "alice")
    res = rename(client, auth, "alicia", password="wrong-password")
    assert (res.status_code, res.get_json()) == (403, {"error": "Current password is incorrect"})


def test_cooldown_blocks_a_second_rename_within_5_days(client, db_conn):
    user_id, auth = register(client, "alice")
    assert rename(client, auth, "alicia").status_code == 200
    second = rename(client, auth, "alissa")
    assert second.status_code == 400 and "once every 5 days" in second.get_json()["error"]
    shift(db_conn, user_id, 5)
    assert rename(client, auth, "alissa").status_code == 200


def test_old_name_is_reserved_against_everyone_else(client, db_conn, make_user):
    user_id, auth = register(client, "alice")
    rename(client, auth, "alicia")
    with db_conn.cursor() as cur:
        cur.execute("SELECT username, user_id, reserved_until FROM username_reservations")
        [reservation] = cur.fetchall()
    assert (reservation["username"], reservation["user_id"]) == ("alice", user_id)
    assert timedelta(days=14, hours=23) < reservation["reserved_until"] - utc_now() <= timedelta(days=15)

    _, other = register(client, "bobby")
    assert rename(client, other, "ALICE").get_json() == {"error": "Username already exists"}
    assert client.post("/api/auth/register", json={"username": "alice", "password": PASSWORD}).status_code == 409
    _, token = make_user()
    claim = client.post("/api/auth/claim", json={"username": "alice", "password": PASSWORD},
                        headers={"Authorization": token})
    assert claim.status_code == 409
    assert client.get("/api/auth/check-username/alice").get_json() == {"available": False}


def test_old_profile_link_redirects_within_the_window(client):
    _, auth = register(client, "alice")
    rename(client, auth, "alicia")
    res = client.get("/api/profile/alice")
    assert res.status_code == 302
    assert res.headers["Cache-Control"] == "no-store"
    assert res.headers["Location"].endswith("/api/profile/alicia")
    assert res.get_json() == {"redirect_to": "alicia"}
    assert client.get("/api/profile/alice", follow_redirects=True).get_json()["username"] == "alicia"


def test_old_name_is_free_after_15_days(client, db_conn):
    user_id, auth = register(client, "alice")
    rename(client, auth, "alicia")
    shift(db_conn, user_id, 15)
    assert client.get("/api/profile/alice").status_code == 404
    assert client.get("/api/auth/check-username/alice").get_json() == {"available": True}
    assert client.post("/api/auth/register", json={"username": "alice", "password": PASSWORD}).status_code == 201


def test_owner_can_take_the_reserved_name_back(client, db_conn):
    user_id, auth = register(client, "alice")
    rename(client, auth, "alicia")
    shift(db_conn, user_id, 6)
    assert rename(client, auth, "alice").status_code == 200
    with db_conn.cursor() as cur:
        cur.execute("SELECT username FROM username_reservations WHERE reserved_until > NOW()")
        assert [r["username"] for r in cur.fetchall()] == ["alicia"]
    assert client.get("/api/profile/alicia").headers["Location"].endswith("/api/profile/alice")
