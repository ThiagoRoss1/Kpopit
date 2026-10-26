import logging
import os
import shutil
import subprocess
import tempfile

import boto3
from datetime import datetime
from utils.env import load_local_env
from psycopg.conninfo import conninfo_to_dict

load_local_env()

logger = logging.getLogger(__name__)

# Backups go only to the private bucket in R2_BACKUP_BUCKET_NAME. There is deliberately no fallback
# to R2_BUCKET_NAME (the public image bucket): without the backup bucket nothing is dumped or uploaded.
BUCKET_NAME = os.getenv("R2_BACKUP_BUCKET_NAME")
# A read-only role (kpopit_backup) when set; otherwise the app's own connection.
DB_URL = os.getenv("BACKUP_DB_URL") or os.getenv("DB_URL")
OBJECT_PREFIX = "backups_db/"


# libpq environment variables for each connection parameter: the URL (password included) goes to
# pg_dump through its environment, never its argv, which other processes can read.
_PG_ENV = {
    "host": "PGHOST", "hostaddr": "PGHOSTADDR", "port": "PGPORT", "dbname": "PGDATABASE",
    "user": "PGUSER", "password": "PGPASSWORD", "sslmode": "PGSSLMODE", "sslrootcert": "PGSSLROOTCERT",
    "sslcert": "PGSSLCERT", "sslkey": "PGSSLKEY", "connect_timeout": "PGCONNECT_TIMEOUT",
    "application_name": "PGAPPNAME", "options": "PGOPTIONS", "target_session_attrs": "PGTARGETSESSIONATTRS",
}


def _pg_env(db_url: str) -> dict | None:
    """The process environment plus the connection as PG* variables; None if the URL can't be mapped."""
    try:
        params = conninfo_to_dict(db_url)
    except Exception:
        return None
    if any(key not in _PG_ENV for key in params):
        return None
    clean = {k: v for k, v in os.environ.items() if not k.startswith("PG")}
    return {**clean, **{_PG_ENV[key]: str(value) for key, value in params.items()}}


def _pg_dump_version(pg_dump: str) -> str:
    try:
        result = subprocess.run([pg_dump, "--version"], capture_output=True, text=True, check=True, timeout=30)
        return result.stdout.strip()
    except Exception:
        return "unknown"


def postgresql_backup_to_s3():
    """Dump the database with pg_dump and upload it to R2_BACKUP_BUCKET_NAME under OBJECT_PREFIX.

    Returns (success, filename). Only controlled diagnostics go to logs: neither the
    database URL nor pg_dump stderr, whose parse errors can echo credential fragments."""
    prefix = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}_"

    missing = []
    if not DB_URL:
        missing.append("BACKUP_DB_URL or DB_URL")
    if not BUCKET_NAME:
        missing.append("R2_BACKUP_BUCKET_NAME")
    if missing:
        logger.error("Backup misconfigured, missing environment variables: %s", ", ".join(missing))
        return False, None

    pg_dump = shutil.which("pg_dump")
    if not pg_dump:
        logger.error("Backup failed: pg_dump is not installed in this container (install a PostgreSQL client matching the server major)")
        return False, None
    logger.info("Backup starting with %s", _pg_dump_version(pg_dump))

    local_path = None
    try:
        # Private, unique files and object names even for requests in the same second.
        fd, local_path = tempfile.mkstemp(prefix=prefix, suffix=".sql", dir=tempfile.gettempdir())
        os.close(fd)
        filename = os.path.basename(local_path)
        env = _pg_env(DB_URL)
        if env is None:
            logger.error("Backup failed: the database URL has an unsupported format or connection parameter")
            return False, None
        result = subprocess.run(
            [
                pg_dump,
                '--file', local_path,
                '--no-owner',
                '--no-privileges',
                '--column-inserts',
                '--serializable-deferrable',
            ],
            capture_output=True,
            text=True,
            timeout=300,
            env=env,
        )
        if result.returncode != 0:
            logger.error("Backup failed: pg_dump exited with %s; check database access and client/server versions", result.returncode)
            return False, None

        # Preserve pg_dump verbatim, including psql's safety meta-commands and any
        # backslash-prefixed lines in multiline user data. Restore through psql.

        s3 = boto3.client(
            service_name='s3',
            endpoint_url=os.getenv("R2_ENDPOINT_URL"),
            aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
            region_name='auto',
        )

        logger.info("Uploading backup %s to R2...", filename)
        s3.upload_file(local_path, BUCKET_NAME, f"{OBJECT_PREFIX}{filename}")
        logger.info("Backup %s uploaded successfully.", filename)
        return True, filename

    except Exception as e:
        # Never str(e) a subprocess error here: its message holds the command line, DB_URL included.
        logger.error("Backup failed during dump/upload: %s", type(e).__name__)
        return False, None

    finally:
        try:
            if local_path is not None:
                os.remove(local_path)
        except FileNotFoundError:
            pass
        except OSError:
            logger.warning("Could not delete the local dump %s", local_path)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    success, filename = postgresql_backup_to_s3()
    if success:
        logger.info("Backup successful: %s%s", OBJECT_PREFIX, filename)
    else:
        logger.error("Backup failed (see log above)")
    raise SystemExit(0 if success else 1)

