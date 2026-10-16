"""
Build a fresh test database from the repo alone: init_db.py schema → every migration →
seed CSVs (data/) → Collection cards. Used by CI (pytest and Playwright jobs) and works
locally the same way. Never a production copy.

    DB_URL=postgresql://postgres:postgres@localhost:5432/kpopit_test DATA_FOLDER=data \
        python scripts/bootstrap_db.py

Refuses any host other than localhost, and exits non-zero if a migration fails
(the migration runner raises immediately on its first failure).
"""

import logging
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))
os.chdir(BACKEND_ROOT)

LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}


def main() -> int:
    # The migration runner reports through logging; without this its INFO/ERROR lines are lost in CI.
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    db_url = os.getenv("DB_URL") or ""
    if urlparse(db_url).hostname not in LOCAL_HOSTS:
        print("bootstrap_db: DB_URL must point at a local database (localhost/127.0.0.1).")
        return 1
    os.environ.setdefault("DATA_FOLDER", str(BACKEND_ROOT / "data"))

    import psycopg

    from init_db import init_db
    from migrations.migrations import apply_migrations

    init_db()
    try:
        apply_migrations()
    except Exception:
        return 1  # the runner already logged the file and the server's message

    expected = sorted(p.name for p in (BACKEND_ROOT / "migrations").glob("*.sql"))
    with psycopg.connect(db_url) as conn:
        applied = {row[0] for row in conn.execute("SELECT migration_filename FROM schema_migrations")}
    missing = [name for name in expected if name not in applied]
    if missing:
        print(f"bootstrap_db: migrations not applied: {', '.join(missing)}")
        return 1

    from seed_collection_cards import run_seed_cards
    from seed_db import run_seed
    from services.get_db import pool

    try:
        run_seed()
        run_seed_cards()
    finally:
        pool.close()
    print(f"bootstrap_db: schema + {len(expected)} migrations + seed data ready.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
