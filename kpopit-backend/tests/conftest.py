"""
Integration-test scaffolding: a local, disposable `kpopit_test` database (TEST_DB_URL).
Every test starts from TRUNCATEd tables with the gamemodes and Album 1 re-seeded.
"""

import os
import sys
from pathlib import Path

import psycopg
import pytest
from psycopg.rows import dict_row

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

# Test targets and secrets must be explicit; never load workstation .env files.
os.environ["PYTHON_DOTENV_DISABLED"] = "1"


def _resolve_test_db_url() -> str:
    from urllib.parse import urlsplit, urlunsplit
    from psycopg.conninfo import conninfo_to_dict

    url = os.getenv("TEST_DB_URL")
    if not url:
        base = os.getenv("DB_URL")
        if not base:
            raise RuntimeError("Set TEST_DB_URL to the local disposable kpopit_test database.")
        parsed = urlsplit(base)
        if parsed.scheme not in ("postgresql", "postgres"):
            raise RuntimeError("Set an explicit local TEST_DB_URL.")
        url = urlunsplit(parsed._replace(path="/kpopit_test"))
    try:
        params = conninfo_to_dict(url)
    except Exception:
        raise RuntimeError("Invalid test database configuration.") from None
    local_hosts = {"localhost", "127.0.0.1", "::1"}
    if (params.get("host") not in local_hosts or params.get("dbname") != "kpopit_test"
            or (params.get("hostaddr") or os.getenv("PGHOSTADDR")) not in (None, "127.0.0.1", "::1")
            or params.get("service") or os.getenv("PGSERVICE")):
        raise RuntimeError("Tests require a local disposable database named exactly kpopit_test.")
    return url


TEST_DB_URL = _resolve_test_db_url()
os.environ["DB_URL"] = TEST_DB_URL
os.environ.setdefault(
    "JWT_SECRET_KEY",
    "test_jwt_secret_key_at_least_32_chars_long_for_pytest_runs",
)
os.environ.setdefault("FLASK_ENV", "development")
# Read at import by collection_bp and the grant hook; tests flip the hook via monkeypatch.
os.environ["COLLECTION_ENABLED"] = "true"
# Register the admin blueprint regardless of the local .env, so its auth rules are always tested.
os.environ["ADMIN_ENABLED"] = "true"
# Same for the public profile route, which is off by default.
os.environ["PUBLIC_PROFILE_ENABLED"] = "true"
os.environ["CALENDAR_ENABLED"] = "true"
os.environ["IDOL_XP_ENABLED"] = "true"
# No test may reach Resend: emails go to a per-test outbox (see the email_outbox fixture),
# and the real key from .env is replaced before email_service reads it at import.
os.environ["EMAIL_DELIVERY"] = "outbox"
os.environ["RESEND_API_KEY"] = "re_disabled_for_tests"

# The app and every module that reads env vars at import are imported lazily, inside the
# fixtures, so the environment above is always in place first.


TRUNCATE_SQL = """
    TRUNCATE TABLE
        daily_user_history,
        user_history,
        daily_picks,
        yesterday_picks,
        albums,
        blurry_mode_data,
        user_cards,
        cards,
        collection_group_eligibility,
        collections,
        idol_career,
        idol_company_affiliation,
        group_company_affiliation,
        group_features,
        idols,
        groups,
        companies,
        refresh_tokens,
        email_tokens,
        user_profiles,
        users
    RESTART IDENTITY CASCADE
"""

SEED_GAMEMODES_SQL = """
    INSERT INTO gamemodes (id, name, description, is_active) VALUES
        (1, 'classic',   'classic',   TRUE),
        (2, 'blurry',    'blurry',    TRUE),
        (3, 'pixelated', 'pixelated', FALSE)
    ON CONFLICT (id) DO NOTHING
"""

SEED_COLLECTIONS_SQL = """
    INSERT INTO collections (id, name) VALUES (1, 'Album 1')
    ON CONFLICT (id) DO NOTHING
"""


@pytest.fixture(scope="session")
def app():
    from app import app as flask_app

    flask_app.config["TESTING"] = True
    yield flask_app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def db_conn():
    conn = psycopg.connect(TEST_DB_URL, row_factory=dict_row)
    try:
        yield conn
    finally:
        conn.close()


class Outbox:
    """Emails written by EmailService._send in outbox mode, oldest first."""

    def __init__(self, path):
        self.path = path

    def all(self) -> list[dict]:
        import json

        return [json.loads(p.read_text(encoding="utf-8")) for p in sorted(self.path.glob("*.json"))]

    def latest_to(self, address: str) -> dict | None:
        sent = [m for m in self.all() if m["to"] == address]
        return sent[-1] if sent else None

    def wait_for(self, address: str, timeout: float = 5.0) -> dict | None:
        """latest_to, polling: some emails (forgot-password) are sent off the request thread."""
        import time

        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            mail = self.latest_to(address)
            if mail:
                return mail
            time.sleep(0.05)
        return None


@pytest.fixture(autouse=True)
def email_outbox(monkeypatch, tmp_path):
    """Fresh outbox per test; a direct Resend call fails the test."""
    import resend

    def _no_resend(*_args, **_kwargs):
        raise AssertionError("tests must never call Resend")

    outbox_dir = tmp_path / "outbox"
    monkeypatch.setenv("EMAIL_DELIVERY", "outbox")
    monkeypatch.setenv("EMAIL_OUTBOX_DIR", str(outbox_dir))
    monkeypatch.setattr(resend.Emails, "send", _no_resend)
    return Outbox(outbox_dir)


@pytest.fixture(autouse=True)
def reset_rate_limits(app):
    """In-memory limiter counters are process-wide; start every test from zero.
    Depends on `app`: the limiter only has storage once the app has called init_app."""
    from utils.rate_limiter import limiter

    limiter.reset()
    yield


@pytest.fixture(autouse=True)
def reset_db(db_conn):
    with db_conn.cursor() as cur:
        cur.execute(TRUNCATE_SQL)
        cur.execute(SEED_GAMEMODES_SQL)
        cur.execute(SEED_COLLECTIONS_SQL)
    db_conn.commit()
    yield


@pytest.fixture
def today():
    from utils.dates import get_today_date_str

    return get_today_date_str()


@pytest.fixture
def make_user(db_conn):
    """Insert a `users` row with a given (or generated) UUID token; return both."""
    import uuid

    def _make(token: str | None = None) -> tuple[int, str]:
        token = token or str(uuid.uuid4())
        with db_conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (token) VALUES (%s) RETURNING id",
                (token,),
            )
            user_id = cur.fetchone()["id"]
        db_conn.commit()
        return user_id, token

    return _make


@pytest.fixture
def make_group(db_conn):
    def _make(name: str = "TestGroup", **kwargs) -> int:
        with db_conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO groups (name, group_debut_year, member_count, generation, fandom_name, is_published)
                VALUES (%s, %s, %s, %s, %s, TRUE)
                RETURNING id
                """,
                (
                    name,
                    kwargs.get("debut_year", 2020),
                    kwargs.get("member_count", 4),
                    kwargs.get("generation", 4),
                    kwargs.get("fandom_name", "TestFans"),
                ),
            )
            gid = cur.fetchone()["id"]
        db_conn.commit()
        return gid

    return _make


@pytest.fixture
def make_album(db_conn):
    def _make(name: str, group_id: int, cover_path: str = "/covers/test.jpg") -> int:
        with db_conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO albums (name, group_id, type, release_date, cover_path, is_published)
                VALUES (%s, %s, 'Studio Album', '2020-01-01', %s, TRUE)
                RETURNING id
                """,
                (name, group_id, cover_path),
            )
            aid = cur.fetchone()["id"]
        db_conn.commit()
        return aid

    return _make


@pytest.fixture
def set_daily_pick(db_conn, today):
    """Pin today's pick for a gamemode to a specific album_id."""

    def _set(album_id: int, gamemode_id: int = 3):
        with db_conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO daily_picks (pick_date, album_id, gamemode_id)
                VALUES (%s, %s, %s)
                ON CONFLICT (pick_date, gamemode_id) DO UPDATE SET album_id = EXCLUDED.album_id
                """,
                (today, album_id, gamemode_id),
            )
        db_conn.commit()

    return _set


@pytest.fixture
def set_yesterday_album_pick(db_conn):
    """Pin YESTERDAY's album pick for a gamemode (store-yesterdays-* tests)."""
    from datetime import timedelta

    from utils.dates import get_today_date

    yesterday = (get_today_date() - timedelta(days=1)).isoformat()

    def _set(album_id: int, gamemode_id: int = 3):
        with db_conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO daily_picks (pick_date, album_id, gamemode_id)
                VALUES (%s, %s, %s)
                ON CONFLICT (pick_date, gamemode_id) DO UPDATE SET album_id = EXCLUDED.album_id
                """,
                (yesterday, album_id, gamemode_id),
            )
        db_conn.commit()
        return yesterday

    return _set


@pytest.fixture
def make_soloist_album(db_conn):
    """Insert a soloist album and return (album_id, artist_name).
    `albums_soloist_check` needs group_id = 20 with a soloist_id, so this forces group 20 and a
    real idol as the soloist (exercises COALESCE(artist_name, group_name))."""

    def _make(name: str, cover_path: str = "/covers/solo.jpg", artist_name: str = "Solo Star") -> tuple[int, str]:
        with db_conn.cursor() as cur:
            # The soloist group must be id 20 to satisfy albums_soloist_check.
            cur.execute(
                """
                INSERT INTO groups (id, name, group_debut_year, member_count, generation, fandom_name, is_published)
                VALUES (20, %s, 2020, 1, 4, 'SoloFans', TRUE)
                ON CONFLICT (id) DO NOTHING
                """,
                ("Soloists",),
            )
            cur.execute(
                """
                INSERT INTO idols (artist_name, gender, nationality)
                VALUES (%s, 'F', 'South Korea')
                RETURNING id
                """,
                (artist_name,),
            )
            soloist_id = cur.fetchone()["id"]
            cur.execute(
                """
                INSERT INTO albums (name, group_id, soloist_id, type, release_date, cover_path, is_published)
                VALUES (%s, 20, %s, 'Studio Album', '2020-01-01', %s, TRUE)
                RETURNING id
                """,
                (name, soloist_id, cover_path),
            )
            aid = cur.fetchone()["id"]
        db_conn.commit()
        return aid, artist_name

    return _make


# --- Collection fixtures (Album 1) ---


@pytest.fixture
def make_idol(db_conn):
    """Insert an `idols` row (published by default); return its id."""

    def _make(artist_name: str = "Test Idol", is_published: bool = True,
              image_path: str | None = None) -> int:
        with db_conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO idols (artist_name, gender, nationality, is_published, image_path)
                VALUES (%s, 'F', 'South Korea', %s, %s)
                RETURNING id
                """,
                (artist_name, is_published, image_path),
            )
            idol_id = cur.fetchone()["id"]
        db_conn.commit()
        return idol_id

    return _make


@pytest.fixture
def make_career(db_conn):
    """Insert an `idol_career` stint linking an idol to a group."""

    def _make(idol_id: int, group_id: int, is_active: bool = True,
              start_year: int | None = 2020, end_year: int | None = None) -> None:
        with db_conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO idol_career (idol_id, group_id, is_active, start_year, end_year)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (idol_id, group_id) DO NOTHING
                """,
                (idol_id, group_id, is_active, start_year, end_year),
            )
        db_conn.commit()

    return _make


@pytest.fixture
def make_eligible_group(make_group, db_conn):
    """Create a group and its `collection_group_eligibility` row; return the group id."""

    def _make(name: str = "CollectGroup", is_eligible: bool = True,
              has_bonus_cover: bool = True, collection_id: int = 1) -> int:
        group_id = make_group(name)
        with db_conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO collection_group_eligibility (collection_id, group_id, is_eligible, has_bonus_cover)
                VALUES (%s, %s, %s, %s)
                """,
                (collection_id, group_id, is_eligible, has_bonus_cover),
            )
        db_conn.commit()
        return group_id

    return _make


@pytest.fixture
def make_card(db_conn):
    """Insert a `cards` catalog row (idol / group_photo); return its id."""

    def _make(idol_id: int | None = None, group_id: int | None = None,
              card_type: str = "idol", image_path: str | None = None,
              collection_id: int = 1) -> int:
        with db_conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO cards (collection_id, idol_id, group_id, card_type, image_path)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (collection_id, idol_id, group_id, card_type, image_path),
            )
            card_id = cur.fetchone()["id"]
        db_conn.commit()
        return card_id

    return _make


@pytest.fixture
def collection_page(make_eligible_group, make_idol, make_career, make_card):
    """Build a full eligible page: group + N carded members (+ optional group_photo card).

    Returns {"group_id", "idol_ids", "card_ids", "group_photo_card_id"}.
    """

    def _make(name: str = "PageGroup", n_members: int = 2, has_bonus_cover: bool = True,
              with_group_photo: bool = True) -> dict:
        group_id = make_eligible_group(name, has_bonus_cover=has_bonus_cover)
        idol_ids, card_ids = [], []
        for i in range(n_members):
            idol_id = make_idol(f"{name} Member {i + 1}")
            make_career(idol_id, group_id)
            idol_ids.append(idol_id)
            card_ids.append(make_card(idol_id=idol_id))
        group_photo_card_id = None
        if has_bonus_cover and with_group_photo:
            group_photo_card_id = make_card(group_id=group_id, card_type="group_photo")
        return {
            "group_id": group_id,
            "idol_ids": idol_ids,
            "card_ids": card_ids,
            "group_photo_card_id": group_photo_card_id,
        }

    return _make


@pytest.fixture
def make_access_jwt():
    """Mint an access JWT for a user, mirroring AuthService.generate_access_token."""
    from datetime import timedelta

    import jwt as pyjwt

    from utils.dates import utc_now

    def _make(user_id: int, token: str, username: str = "testuser") -> str:
        now = utc_now()
        payload = {
            "sub": token,
            "user_id": user_id,
            "username": username,
            "is_admin": False,
            "is_authenticated": True,
            "type": "access",
            "iat": now,
            "exp": now + timedelta(hours=1),
        }
        return pyjwt.encode(payload, os.environ["JWT_SECRET_KEY"], algorithm="HS256")

    return _make
