"""The real CLI must fail fast, roll back its failed file, and be safe to rerun."""

import os
from pathlib import Path
import shutil
import subprocess
import sys
import uuid

import pytest
from psycopg import sql
from psycopg.conninfo import make_conninfo


@pytest.fixture
def migration_cli(db_conn, tmp_path):
    schema = "migration_test_" + uuid.uuid4().hex
    db_conn.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
    db_conn.commit()
    runner = tmp_path / "migrations.py"
    shutil.copyfile(Path(__file__).parents[1] / "migrations/migrations.py", runner)
    env = {**os.environ, "DB_URL": make_conninfo(os.environ["DB_URL"], options=f"-c search_path={schema}"),
           "PYTHON_DOTENV_DISABLED": "1"}

    def run():
        return subprocess.run([sys.executable, str(runner)], env=env, capture_output=True, text=True, timeout=20)

    try:
        yield tmp_path, schema, run
    finally:
        db_conn.rollback()
        db_conn.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))
        db_conn.commit()


def test_cli_stops_at_first_failure_and_rolls_back_that_file(db_conn, migration_cli):
    directory, schema, run = migration_cli
    (directory / "001_good.sql").write_text("CREATE TABLE before_failure (id int);", encoding="utf-8")
    (directory / "002_bad.sql").write_text("CREATE TABLE rolled_back (id int); SELECT missing_column;", encoding="utf-8")
    (directory / "003_later.sql").write_text("CREATE TABLE never_run (id int);", encoding="utf-8")

    result = run()
    assert result.returncode != 0
    for table, exists in [("before_failure", True), ("rolled_back", False), ("never_run", False)]:
        assert (db_conn.execute("SELECT to_regclass(%s)", (f"{schema}.{table}",)).fetchone()["to_regclass"] is not None) is exists
    rows = db_conn.execute(sql.SQL("SELECT migration_filename FROM {}.schema_migrations").format(sql.Identifier(schema))).fetchall()
    assert [r["migration_filename"] for r in rows] == ["001_good.sql"]


def test_cli_success_and_repeat_are_zero(db_conn, migration_cli):
    directory, schema, run = migration_cli
    (directory / "001_good.sql").write_text("CREATE TABLE only_once (id int);", encoding="utf-8")
    assert run().returncode == 0
    assert run().returncode == 0
    count = db_conn.execute(sql.SQL("SELECT count(*) AS n FROM {}.schema_migrations").format(sql.Identifier(schema))).fetchone()["n"]
    assert count == 1


def test_cli_connection_failure_is_nonzero(tmp_path):
    runner = Path(__file__).parents[1] / "migrations/migrations.py"
    env = {**os.environ, "DB_URL": "postgresql://test@127.0.0.1:9/missing?connect_timeout=1", "PYTHON_DOTENV_DISABLED": "1"}
    result = subprocess.run([sys.executable, str(runner)], env=env, capture_output=True, text=True, timeout=10)
    assert result.returncode != 0
