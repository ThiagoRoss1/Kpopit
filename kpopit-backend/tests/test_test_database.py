"""A test runner must reject remote, misnamed, or query-overridden database targets."""

import pytest
from conftest import _resolve_test_db_url


@pytest.mark.parametrize("url", [
    "postgresql://test@remote.invalid/kpopit_test",
    "postgresql://test@localhost/kpopit_test_copy",
    "postgresql://test@localhost/kpopit_test?host=remote.invalid",
    "postgresql://test@localhost/kpopit_test?hostaddr=192.0.2.1",
])
def test_refuses_unsafe_test_db_urls(monkeypatch, url):
    monkeypatch.setenv("TEST_DB_URL", url)
    with pytest.raises(RuntimeError):
        _resolve_test_db_url()


def test_default_replaces_database_name_without_losing_url_parameters(monkeypatch):
    monkeypatch.delenv("TEST_DB_URL", raising=False)
    monkeypatch.setenv("DB_URL", "postgresql://test@127.0.0.1:55432/catalog?application_name=pytest")
    assert _resolve_test_db_url() == "postgresql://test@127.0.0.1:55432/kpopit_test?application_name=pytest"
