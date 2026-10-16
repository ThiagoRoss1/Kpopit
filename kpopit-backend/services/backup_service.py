import logging
import os
import shutil
import subprocess
import tempfile

import boto3
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

BUCKET_NAME = os.getenv("R2_BUCKET_NAME")
DB_URL = os.getenv("BACKUP_DB_URL") or os.getenv("DB_URL")


def _pg_dump_version(pg_dump: str) -> str:
    try:
        result = subprocess.run([pg_dump, "--version"], capture_output=True, text=True, check=True, timeout=30)
        return result.stdout.strip()
    except Exception:
        return "unknown"


def postgresql_backup_to_s3():
    """Dump the database with pg_dump and upload it to R2 under backups/.

    Returns (success, filename). Only controlled diagnostics go to logs: neither the
    database URL nor pg_dump stderr, whose parse errors can echo credential fragments."""
    prefix = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}_"

    missing = []
    if not DB_URL:
        missing.append("DB_URL")
    if not BUCKET_NAME:
        missing.append("R2_BUCKET_NAME")
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
        result = subprocess.run(
            [
                pg_dump,
                '--dbname', DB_URL,
                '--file', local_path,
                '--no-owner',
                '--no-privileges',
                '--column-inserts',
                '--serializable-deferrable',
            ],
            capture_output=True,
            text=True,
            timeout=300,
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
        s3.upload_file(local_path, BUCKET_NAME, f"backups/{filename}")
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
    logger.info("Backup successful: %s", filename) if success else logger.error("Backup failed (see log above)")

