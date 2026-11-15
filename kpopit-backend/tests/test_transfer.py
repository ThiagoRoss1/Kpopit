"""Transfer codes: a code moves a token once, even when two redemptions race, and redemption is
rate limited per client."""

import psycopg
from psycopg.rows import dict_row

from services.transfer_service import TransferError, TransferService
from tests.conftest import TEST_DB_URL


def _code_for(client, token):
    res = client.post("/api/generate-transfer-code", headers={"X-User-Token": token})
    assert res.status_code == 200, res.get_json()
    return res.get_json()["transfer_code"]


def test_a_code_redeems_once(client, make_user):
    _, token = make_user()
    code = _code_for(client, token)

    first = client.post("/api/transfer-data", json={"code": code})
    assert (first.status_code, first.get_json()) == (200, {"user_token": token})

    second = client.post("/api/transfer-data", json={"code": code})
    assert (second.status_code, second.get_json()) == (400, {"error": "Transfer code has already been used"})


class _RaceCursor:
    """Lets a second request claim the code right after this one has read it as unused."""

    def __init__(self, cursor, rival):
        self.cursor, self.rival = cursor, rival

    def execute(self, query, params=None):
        if "UPDATE transfer_data" in query:
            self.rival()
        return self.cursor.execute(query, params)

    def fetchone(self):
        return self.cursor.fetchone()


def test_a_racing_redemption_loses(client, make_user):
    _, token = make_user()
    code = _code_for(client, token)

    def rival():
        with psycopg.connect(TEST_DB_URL, row_factory=dict_row) as other:
            assert TransferService(other).redeem(other.cursor(), code) == token

    with psycopg.connect(TEST_DB_URL, row_factory=dict_row) as conn:
        cursor = _RaceCursor(conn.cursor(), rival)
        try:
            TransferService(conn).redeem(cursor, code)
        except TransferError as err:
            assert str(err) == "Transfer code has already been used"
        else:
            raise AssertionError("both redemptions returned the token")


def test_redemption_is_rate_limited(client):
    statuses = [client.post("/api/transfer-data", json={"code": "000-ZZZ"}).status_code for _ in range(6)]
    assert statuses == [400] * 5 + [429]
