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
DB_URL = os.getenv("DB_URL")


def sanitize_dump_for_sql_editors(local_path):
    """Remove psql meta-commands (e.g. \restrict) unsupported by SQL editors like DBeaver."""
    with open(local_path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()

    cleaned_lines = [line for line in lines if not line.lstrip().startswith("\\")]

    with open(local_path, "w", encoding="utf-8", newline="") as f:
        f.writelines(cleaned_lines)

def _pg_dump_version(pg_dump: str) -> str:
    try:
        result = subprocess.run([pg_dump, "--version"], capture_output=True, text=True, check=True, timeout=30)
        return result.stdout.strip()
    except Exception:
        return "unknown"


def postgresql_backup_to_s3():
    """Dump the database with pg_dump and upload it to R2 under backups/.

    Returns (success, filename). Failure details go to the logs only, and DB_URL is
    never logged (it carries the password): pg_dump's own error output is redacted."""
    filename = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"

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

    local_path = os.path.join(tempfile.gettempdir(), filename)

    try:
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
        )
        if result.returncode != 0:
            stderr = (result.stderr or "").replace(DB_URL, "<DB_URL>").strip()
            logger.error("Backup failed: pg_dump exited with %s: %s", result.returncode, stderr[-2000:])
            return False, None

        sanitize_dump_for_sql_editors(local_path)
        
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
            os.remove(local_path)
        except FileNotFoundError:
            pass
        except OSError:
            logger.warning("Could not delete the local dump %s", local_path)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    success, filename = postgresql_backup_to_s3()
    print(f"Backup successful: {filename}" if success else "Backup failed (see log above)")
    