"""
Integration-test scaffolding for kpopit-backend.

Requirements
------------
- A local PostgreSQL database with the full schema already applied.
- `TEST_DB_URL` env var pointing to that DB.
  If unset, we fall back to `DB_URL` with the database name swapped to
  `kpopit_test` so accidental runs never touch the dev/prod DB.

The fixture suite TRUNCATEs every transactional table before each test and
re-seeds the three gamemodes (FK targets), giving each test a clean slate.
"""

import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

# Load .env so TEST_DB_URL / JWT_SECRET_KEY are available without requiring
# the developer to export them in the shell first.
from dotenv import load_dotenv  # noqa: E402

load_dotenv(BACKEND_ROOT / ".env")


def _resolve_test_db_url() -> str:
    explicit = os.getenv("TEST_DB_URL")
    if explicit:
        return explicit

    base = os.getenv("DB_URL")
    if not base:
        raise RuntimeError(
            "TEST_DB_URL (or DB_URL) must be set to run the test suite."
        )
    if "/kpopit_test" in base:
        return base
    # Replace the trailing /<dbname> segment with /kpopit_test so we never
    # accidentally TRUNCATE the dev DB.
    head, _, _ = base.rpartition("/")
    if not head:
        raise RuntimeError(
            "Could not derive kpopit_test URL from DB_URL — set TEST_DB_URL explicitly."
        )
    return f"{head}/kpopit_test"


TEST_DB_URL = _resolve_test_db_url()
os.environ["DB_URL"] = TEST_DB_URL
os.environ.setdefault(
    "JWT_SECRET_KEY",
    "test_jwt_secret_key_at_least_32_chars_long_for_pytest_runs",
)
os.environ.setdefault("FLASK_ENV", "development")

import psycopg  # noqa: E402
import pytest  # noqa: E402
from psycopg.rows import dict_row  # noqa: E402

from app import app as flask_app  # noqa: E402
from utils.dates import get_today_date_str  # noqa: E402


TRUNCATE_SQL = """
    TRUNCATE TABLE
        daily_user_history,
        user_history,
        daily_picks,
        yesterday_picks,
        albums,
        blurry_mode_data,
        idol_career,
        idol_company_affiliation,
        group_company_affiliation,
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


@pytest.fixture(scope="session")
def app():
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


@pytest.fixture(autouse=True)
def reset_db(db_conn):
    with db_conn.cursor() as cur:
        cur.execute(TRUNCATE_SQL)
        cur.execute(SEED_GAMEMODES_SQL)
    db_conn.commit()
    yield


@pytest.fixture
def today():
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
                INSERT INTO albums (name, group_id, type, release_year, cover_path, is_published)
                VALUES (%s, %s, 'Studio Album', 2020, %s, TRUE)
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

    The `albums_soloist_check` constraint requires `group_id = 20 AND
    soloist_id IS NOT NULL`, so this forces a `groups` row with id=20 and
    attaches a real `idols` row as the soloist. Exercises the
    COALESCE(artist_name, group_name) branch.
    """

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
                INSERT INTO albums (name, group_id, soloist_id, type, release_year, cover_path, is_published)
                VALUES (%s, 20, %s, 'Studio Album', 2020, %s, TRUE)
                RETURNING id
                """,
                (name, soloist_id, cover_path),
            )
            aid = cur.fetchone()["id"]
        db_conn.commit()
        return aid, artist_name

    return _make
