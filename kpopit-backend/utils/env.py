"""The only place the backend loads .env. Test runners set PYTHON_DOTENV_DISABLED (any non-empty value):
then nothing is loaded, whatever python-dotenv or Flask would do, and require_isolated_startup() (app,
pool, migrations) refuses a non-local database or a `flask run` that would load .env itself."""

import os
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
DOTENV_PATH = BACKEND_ROOT / ".env"
LOCAL_DB_HOSTS = {"localhost", "127.0.0.1", "::1"}
DB_URL_VARS = ("DB_URL", "BACKUP_DB_URL")


def dotenv_disabled(environ=os.environ) -> bool:
    return bool(environ.get("PYTHON_DOTENV_DISABLED"))


def _flask_skips_dotenv(environ) -> bool:
    # Same reading as flask.helpers.get_load_dotenv: any value but empty/0/false/no skips.
    value = environ.get("FLASK_SKIP_DOTENV") or ""
    return bool(value) and value.lower() not in ("0", "false", "no")


def _is_local_db(url: str, environ) -> bool:
    from psycopg.conninfo import conninfo_to_dict

    try:
        params = conninfo_to_dict(url)
    except Exception:
        return False
    hostaddr = params.get("hostaddr") or environ.get("PGHOSTADDR")
    return (params.get("host") in LOCAL_DB_HOSTS and hostaddr in (None, "127.0.0.1", "::1")
            and not params.get("service") and not environ.get("PGSERVICE"))


def require_isolated_startup(environ=os.environ) -> None:
    """With dotenv disabled (a test run), refuse to start against a non-local database or under a
    `flask run` that would have loaded .env itself. Raises RuntimeError; values are never shown."""
    if not dotenv_disabled(environ):
        return
    if environ.get("FLASK_RUN_FROM_CLI") == "true" and not _flask_skips_dotenv(environ):
        raise RuntimeError("PYTHON_DOTENV_DISABLED is set but flask run loads .env: set FLASK_SKIP_DOTENV=1.")
    for name in DB_URL_VARS:
        url = environ.get(name)
        if url and not _is_local_db(url, environ):
            raise RuntimeError(f"PYTHON_DOTENV_DISABLED is set: {name} must point to localhost/127.0.0.1.")


def load_local_env(dotenv_path=None) -> bool:
    """Load kpopit-backend/.env (or `dotenv_path`) without overriding variables already set.
    Does nothing when PYTHON_DOTENV_DISABLED is set. Returns True if a file was loaded."""
    if dotenv_disabled():
        return False
    from dotenv import load_dotenv

    return load_dotenv(dotenv_path or DOTENV_PATH, override=False)
