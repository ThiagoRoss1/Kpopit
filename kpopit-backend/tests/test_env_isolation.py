"""Tests never load .env: utils/env.load_local_env is the only loader and does nothing under
PYTHON_DOTENV_DISABLED, `flask run` can't load it behind the helper's back, and a test run refuses a
non-local database. Every .env here is a fake in tmp_path; the real one is never touched."""

import os
import re
import subprocess
import sys
from pathlib import Path

import pytest

from utils import env as env_utils

BACKEND_ROOT = Path(__file__).resolve().parents[1]
FAKE_DOTENV = "DOTENV_SENTINEL=from-dotenv-file\nCALENDAR_ENABLED=true\n"
FAKE_KEYS = ("DOTENV_SENTINEL", "CALENDAR_ENABLED")


@pytest.fixture
def fake_dotenv(tmp_path, monkeypatch):
    path = tmp_path / ".env"
    path.write_text(FAKE_DOTENV, encoding="utf-8")
    saved = {key: os.environ.get(key) for key in FAKE_KEYS}
    for key in FAKE_KEYS:
        monkeypatch.delenv(key, raising=False)
    yield path
    for key, value in saved.items():  # load_dotenv writes os.environ directly
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value


@pytest.mark.parametrize("flag", ["1", "true", "yes", "0"])
def test_flag_set_loads_nothing(fake_dotenv, monkeypatch, flag):
    monkeypatch.setenv("PYTHON_DOTENV_DISABLED", flag)  # any non-empty value disables
    assert env_utils.load_local_env(fake_dotenv) is False
    assert "DOTENV_SENTINEL" not in os.environ
    assert "CALENDAR_ENABLED" not in os.environ  # calendar stays off


def test_without_the_flag_the_helper_loads_the_file(fake_dotenv, monkeypatch):
    monkeypatch.delenv("PYTHON_DOTENV_DISABLED")
    assert env_utils.load_local_env(fake_dotenv) is True
    assert os.environ["DOTENV_SENTINEL"] == "from-dotenv-file"
    assert os.environ["CALENDAR_ENABLED"] == "true"


def test_the_helper_never_overrides_a_set_variable(fake_dotenv, monkeypatch):
    monkeypatch.delenv("PYTHON_DOTENV_DISABLED")
    monkeypatch.setenv("CALENDAR_ENABLED", "false")
    env_utils.load_local_env(fake_dotenv)
    assert os.environ["CALENDAR_ENABLED"] == "false"


def test_only_the_helper_calls_dotenv():
    pattern = re.compile(r"\b(load_dotenv|dotenv_values|find_dotenv)\s*\(|^\s*(from|import)\s+dotenv\b", re.M)
    allowed = {BACKEND_ROOT / "utils" / "env.py", Path(__file__).resolve()}
    offenders = [
        str(path.relative_to(BACKEND_ROOT))
        for path in BACKEND_ROOT.rglob("*.py")
        if ".venv" not in path.parts and path not in allowed
        and pattern.search(path.read_text(encoding="utf-8"))
    ]
    assert offenders == []


@pytest.mark.parametrize("name", ["DB_URL", "BACKUP_DB_URL"])
@pytest.mark.parametrize("url", [
    "postgresql://user@db.example.com/kpopit",
    "postgresql://user@10.0.0.5:5432/kpopit",
    "postgresql://user@localhost/kpopit?host=db.example.com",
    "host=db.example.com dbname=kpopit",
])
def test_startup_refuses_a_remote_database_under_the_flag(name, url):
    environ = {"PYTHON_DOTENV_DISABLED": "1", name: url}
    with pytest.raises(RuntimeError, match=f"{name} must point to localhost"):
        env_utils.require_isolated_startup(environ)


def test_startup_accepts_local_databases_and_ignores_production():
    for url in ("postgresql://u@localhost/kpopit_test", "postgresql://u@127.0.0.1:5432/x", "host=localhost dbname=x"):
        env_utils.require_isolated_startup({"PYTHON_DOTENV_DISABLED": "1", "DB_URL": url})
    # Without the flag (production) the guard does nothing.
    env_utils.require_isolated_startup({"DB_URL": "postgresql://u@db.example.com/kpopit"})


def test_startup_refuses_flask_run_that_would_load_dotenv():
    environ = {"PYTHON_DOTENV_DISABLED": "1", "FLASK_RUN_FROM_CLI": "true", "DB_URL": "postgresql://u@localhost/x"}
    with pytest.raises(RuntimeError, match="FLASK_SKIP_DOTENV"):
        env_utils.require_isolated_startup(environ)
    env_utils.require_isolated_startup({**environ, "FLASK_SKIP_DOTENV": "1"})


def _flask_routes(cwd, **extra):
    """`flask routes` for the app from a directory holding a fake .env (Flask's CLI looks there)."""
    child_env = {k: v for k, v in os.environ.items() if k not in (*FAKE_KEYS, "FLASK_SKIP_DOTENV")}
    child_env.update(PYTHON_DOTENV_DISABLED="1", PYTHONPATH=str(BACKEND_ROOT), **extra)
    return subprocess.run(
        [sys.executable, "-m", "flask", "--app", str(BACKEND_ROOT / "app.py"), "routes"],
        cwd=cwd, env=child_env, capture_output=True, text=True, timeout=60,
    )


def test_flask_cli_never_turns_the_calendar_on_from_dotenv(fake_dotenv):
    # Flask's CLI reads .env with dotenv_values, which ignores PYTHON_DOTENV_DISABLED: without
    # FLASK_SKIP_DOTENV the app refuses to start instead of running with the file's values.
    refused = _flask_routes(fake_dotenv.parent)
    assert refused.returncode != 0 and "FLASK_SKIP_DOTENV" in refused.stderr

    skipped = _flask_routes(fake_dotenv.parent, FLASK_SKIP_DOTENV="1")
    assert skipped.returncode == 0, skipped.stderr[-500:]
    assert "/api/gamemodes-count" in skipped.stdout
    assert "/api/calendar" not in skipped.stdout
