"""Apply pending SQL migrations in filename order; fail fast on any error."""
import logging
import os
from pathlib import Path
import sys

import psycopg
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.getenv("DB_URL")
logger = logging.getLogger(__name__)


def _log_failure(filename: str, error: Exception) -> None:
    """Log what the server said about a failed migration file.

    Only SQL errors raised while running a file reach here (the connection is already open),
    so the server's primary message and context are safe to show; they name the bad statement,
    never the DSN. Anything without diagnostics is logged by type only."""
    diag = getattr(error, "diag", None) if isinstance(error, psycopg.Error) else None
    primary = getattr(diag, "message_primary", None)
    if not primary:
        logger.error("Migration %s failed (%s); stopping", filename, type(error).__name__)
        return
    logger.error("Migration %s failed (%s): %s; stopping", filename, type(error).__name__, primary)
    if diag.context:
        logger.error("Migration %s context: %s", filename, diag.context.strip())


def apply_migrations():
    with psycopg.connect(DB_URL) as conn, conn.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY NOT NULL,
                migration_filename TEXT NOT NULL UNIQUE,
                applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        cursor.execute("SELECT migration_filename FROM schema_migrations")
        applied = {row[0] for row in cursor.fetchall()}

        for migration_file in sorted(Path(__file__).parent.glob("*.sql")):
            if migration_file.name in applied:
                logger.info("Already applied: %s", migration_file.name)
                continue
            logger.info("Applying migration: %s", migration_file.name)
            try:
                up_sql = migration_file.read_text(encoding="utf-8").split("-- DOWN")[0]
                cursor.execute(up_sql)
                cursor.execute(
                    "INSERT INTO schema_migrations (migration_filename) VALUES (%s)",
                    (migration_file.name,),
                )
                conn.commit()
            except Exception as error:
                conn.rollback()
                _log_failure(migration_file.name, error)
                raise
            logger.info("Migration applied: %s", migration_file.name)


def main() -> int:
    try:
        apply_migrations()
    except Exception as error:
        # Connection errors can contain credentials; never print the exception/DSN.
        logger.error("Migration runner failed (%s)", type(error).__name__)
        return 1
    return 0


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    sys.exit(main())
