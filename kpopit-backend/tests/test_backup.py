"""/api/tasks/backup auth + rate limit, and backup_service failure handling. Nothing reaches pg_dump or R2."""

import logging
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import threading

import pytest

from routes import tasks
from services import backup_service

URL = "/api/tasks/backup"
KEY = "test-backup-key-0123456789"


@pytest.fixture(autouse=True)
def fresh_rate_limits():
    """The route allows 3 calls per hour; start each test from zero. Kept here (the shared
    conftest does the same) so these tests also run alone on a branch without that fixture."""
    from utils.rate_limiter import limiter

    limiter.reset()
    yield


@pytest.fixture
def backup_key(monkeypatch):
    monkeypatch.setenv("BACKUP_AUTH_KEY", KEY)


@pytest.fixture
def fake_backup(monkeypatch):
    calls = []

    def _fake():
        calls.append(1)
        return True, "backup_test.sql"

    monkeypatch.setattr(tasks, "postgresql_backup_to_s3", _fake)
    return calls


@pytest.mark.parametrize("value", [None, ""])
def test_missing_key_rejects_everything(client, monkeypatch, fake_backup, caplog, value):
    if value is None:
        monkeypatch.delenv("BACKUP_AUTH_KEY", raising=False)
    else:
        monkeypatch.setenv("BACKUP_AUTH_KEY", value)

    with caplog.at_level(logging.ERROR):
        no_header = client.post(URL)
        empty_bearer = client.post(URL, headers={"Authorization": "Bearer "})
    assert no_header.status_code == 500
    assert empty_bearer.status_code == 500
    assert no_header.get_json() == {"error": "Backup is not available"}
    assert "BACKUP_AUTH_KEY is not set" in caplog.text
    assert fake_backup == []


@pytest.mark.parametrize("header", [None, "Bearer wrong-key", KEY, f"Basic {KEY}", "Bearer"])
def test_wrong_or_malformed_key_is_401(client, backup_key, fake_backup, header):
    headers = {"Authorization": header} if header else {}
    res = client.post(URL, headers=headers)
    assert res.status_code == 401
    assert fake_backup == []


def test_right_key_calls_the_service(client, backup_key, fake_backup):
    res = client.post(URL, headers={"Authorization": f"Bearer {KEY}"})
    assert res.status_code == 200
    assert res.get_json()["message"] == "Backup successful"
    assert fake_backup == [1]


def test_failure_body_is_generic(client, backup_key, monkeypatch):
    monkeypatch.setattr(tasks, "postgresql_backup_to_s3", lambda: (False, None))
    res = client.post(URL, headers={"Authorization": f"Bearer {KEY}"})
    assert res.status_code == 500
    assert res.get_json() == {"error": "Backup failed"}


def test_rate_limit_three_per_hour(client, backup_key, fake_backup):
    headers = {"Authorization": f"Bearer {KEY}"}
    assert [client.post(URL, headers=headers).status_code for _ in range(3)] == [200, 200, 200]
    blocked = client.post(URL, headers=headers)
    assert blocked.status_code == 429
    assert fake_backup == [1, 1, 1]


# --- backup_service ---------------------------------------------------------

FAKE_DB_URL = "postgresql://owner:s3cret-pass@db.internal:5432/kpopit"


@pytest.fixture
def service_env(monkeypatch, tmp_path):
    monkeypatch.setattr(backup_service, "DB_URL", FAKE_DB_URL)
    monkeypatch.setattr(backup_service, "BUCKET_NAME", "test-bucket")
    monkeypatch.setattr(backup_service.tempfile, "gettempdir", lambda: str(tmp_path))
    return tmp_path


def test_missing_pg_dump_is_a_clear_error(service_env, monkeypatch, caplog):
    monkeypatch.setattr(backup_service.shutil, "which", lambda _: None)
    with caplog.at_level(logging.ERROR):
        assert backup_service.postgresql_backup_to_s3() == (False, None)
    assert "pg_dump is not installed" in caplog.text


def test_pg_dump_failure_never_logs_db_url_and_removes_dump(service_env, monkeypatch, caplog):
    monkeypatch.setattr(backup_service.shutil, "which", lambda _: "/usr/bin/pg_dump")

    def fake_run(args, **kwargs):
        if "--version" in args:
            return subprocess.CompletedProcess(args, 0, stdout="pg_dump (PostgreSQL) 17.2\n", stderr="")
        out = args[args.index("--file") + 1]
        open(out, "w").close()
        return subprocess.CompletedProcess(args, 1, stdout="", stderr=(
            f'pg_dump: error: connection to "{FAKE_DB_URL}" failed; '
            'invalid percent-encoded token: "s3cret-pass"'
        ))

    monkeypatch.setattr(backup_service.subprocess, "run", fake_run)
    with caplog.at_level(logging.INFO):
        assert backup_service.postgresql_backup_to_s3() == (False, None)

    assert "pg_dump (PostgreSQL) 17.2" in caplog.text
    assert "s3cret-pass" not in caplog.text
    assert FAKE_DB_URL not in caplog.text
    assert list(service_env.iterdir()) == []


def test_upload_error_never_logs_the_exception_text(service_env, monkeypatch, caplog):
    monkeypatch.setattr(backup_service.shutil, "which", lambda _: "/usr/bin/pg_dump")

    def fake_run(args, **kwargs):
        if "--version" in args:
            return subprocess.CompletedProcess(args, 0, stdout="pg_dump 17\n", stderr="")
        open(args[args.index("--file") + 1], "w").close()
        return subprocess.CompletedProcess(args, 0, stdout="", stderr="")

    class Boom:
        def upload_file(self, *a):
            raise RuntimeError(f"upload failed for {FAKE_DB_URL}")

    monkeypatch.setattr(backup_service.subprocess, "run", fake_run)
    monkeypatch.setattr(backup_service.boto3, "client", lambda *a, **k: Boom())
    with caplog.at_level(logging.INFO):
        assert backup_service.postgresql_backup_to_s3() == (False, None)
    assert "s3cret-pass" not in caplog.text
    assert list(service_env.iterdir()) == []


def test_concurrent_backups_have_independent_files_and_object_keys(service_env, monkeypatch):
    monkeypatch.setattr(backup_service.shutil, "which", lambda _: "/usr/bin/pg_dump")
    barrier = threading.Barrier(2)
    uploads = []

    class FrozenTime:
        @staticmethod
        def now():
            from datetime import datetime
            return datetime(2026, 1, 1)

    monkeypatch.setattr(backup_service, "datetime", FrozenTime)

    def fake_run(args, **kwargs):
        if "--version" in args:
            return subprocess.CompletedProcess(args, 0, stdout="pg_dump 18", stderr="")
        Path(args[args.index("--file") + 1]).write_text("-- intact dump", encoding="utf-8")
        return subprocess.CompletedProcess(args, 0, stdout="", stderr="")

    class Storage:
        def upload_file(self, local_path, bucket, key):
            barrier.wait(timeout=5)
            uploads.append((local_path, key, Path(local_path).read_text(encoding="utf-8")))
            barrier.wait(timeout=5)

    monkeypatch.setattr(backup_service.subprocess, "run", fake_run)
    monkeypatch.setattr(backup_service.boto3, "client", lambda *a, **k: Storage())
    with ThreadPoolExecutor(max_workers=2) as workers:
        results = list(workers.map(lambda _: backup_service.postgresql_backup_to_s3(), range(2)))
    assert all(success for success, _ in results)
    assert len({path for path, _, _ in uploads}) == 2
    assert len({key for _, key, _ in uploads}) == 2
    assert all(content == "-- intact dump" for _, _, content in uploads)
    assert list(service_env.iterdir()) == []


def test_backup_preserves_pg_dump_bytes_and_psql_safety_commands(service_env, monkeypatch):
    payload = b"\\restrict safety_key\nINSERT INTO example VALUES ('hello\n\\user_data\nworld');\n\\unrestrict safety_key\n"
    monkeypatch.setattr(backup_service.shutil, "which", lambda _: "/usr/bin/pg_dump")
    uploaded = []

    def fake_run(args, **kwargs):
        if "--version" in args:
            return subprocess.CompletedProcess(args, 0, stdout="pg_dump 18", stderr="")
        Path(args[args.index("--file") + 1]).write_bytes(payload)
        return subprocess.CompletedProcess(args, 0, stdout="", stderr="")

    class Storage:
        def upload_file(self, local_path, bucket, key):
            uploaded.append(Path(local_path).read_bytes())

    monkeypatch.setattr(backup_service.subprocess, "run", fake_run)
    monkeypatch.setattr(backup_service.boto3, "client", lambda *a, **k: Storage())
    assert backup_service.postgresql_backup_to_s3()[0] is True
    assert uploaded == [payload]
    assert list(service_env.iterdir()) == []


def test_backup_can_use_a_separate_read_only_database_login(monkeypatch):
    import runpy
    monkeypatch.setenv("BACKUP_DB_URL", "postgresql://backup@127.0.0.1/example")
    namespace = runpy.run_path(backup_service.__file__)
    assert namespace["DB_URL"] == "postgresql://backup@127.0.0.1/example"
