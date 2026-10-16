"""
TEST_DATE_OFFSET is a development-only switch: production must ignore it,
whatever the environment says.
"""

from datetime import timedelta

import pytest

from utils import dates
from utils.dates import resolve_test_date_offset


@pytest.mark.parametrize("raw", ["1", "4", "-1", "abc", None])
def test_production_ignores_offset(raw):
    assert resolve_test_date_offset("production", raw) == (False, 0)


def test_unknown_env_ignores_offset():
    assert resolve_test_date_offset("staging", "3") == (False, 0)


def test_development_reads_offset():
    assert resolve_test_date_offset("development", "2") == (True, 2)
    assert resolve_test_date_offset("development", "-1") == (True, -1)


def test_development_defaults_to_off():
    assert resolve_test_date_offset("development", None) == (False, 0)
    assert resolve_test_date_offset("development", "") == (False, 0)
    assert resolve_test_date_offset("development", "0") == (False, 0)
    assert resolve_test_date_offset("development", "not-a-number") == (False, 0)


def test_get_today_date_applies_offset_only_in_test_mode(monkeypatch):
    real_today = dates.datetime.now(dates.TIMEZONE_EST).date()

    monkeypatch.setattr(dates, "TEST_MODE", False)
    monkeypatch.setattr(dates, "TEST_DATE_OFFSET", 5)
    assert dates.get_today_date() == real_today

    monkeypatch.setattr(dates, "TEST_MODE", True)
    monkeypatch.setattr(dates, "TEST_DATE_OFFSET", 2)
    assert dates.get_today_date() == real_today + timedelta(days=2)
