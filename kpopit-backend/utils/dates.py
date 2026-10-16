from datetime import datetime, timezone, timedelta, date
from zoneinfo import ZoneInfo
import os
from dotenv import load_dotenv

load_dotenv()

TIMEZONE_BRT = ZoneInfo('America/Sao_Paulo')
TIMEZONE_EST = ZoneInfo("America/New_York")

FLASK_ENV = os.getenv("FLASK_ENV", "production").lower()

def resolve_test_date_offset(flask_env: str, raw_offset: str | None) -> tuple[bool, int]:
    """Returns (TEST_MODE, TEST_DATE_OFFSET). The offset (days to add/subtract: 1 = tomorrow, -1 = yesterday)
    comes from the TEST_DATE_OFFSET env var and only applies when FLASK_ENV=development; production always gets (False, 0)."""
    if flask_env != "development":
        return False, 0
    try:
        offset = int(raw_offset or 0)
    except ValueError:
        offset = 0
    return offset != 0, offset

TEST_MODE, TEST_DATE_OFFSET = resolve_test_date_offset(FLASK_ENV, os.getenv("TEST_DATE_OFFSET"))

# Game day (shifted by TEST_DATE_OFFSET in development): which puzzle, history and streak day it is.

def get_today_now() -> datetime:
    """Current game-day date and time in America/New_York."""
    if TEST_MODE:
        return datetime.now(TIMEZONE_EST) + timedelta(days=TEST_DATE_OFFSET)

    return datetime.now(TIMEZONE_EST)

def get_today_date() -> date:
    """Today's game date in America/New_York."""
    return get_today_now().date()

def get_today_date_str() -> str:
    """Today's game date as ISO 'YYYY-MM-DD' (API responses, date columns)."""
    return get_today_now().date().isoformat()

# Real time (never offset): token iat/exp, expiries, cooldowns, created_at / won_at / started_at.

def utc_now() -> datetime:
    """Real current date and time in UTC."""
    return datetime.now(timezone.utc)

def est_now() -> datetime:
    """Real current date and time in America/New_York."""
    return datetime.now(TIMEZONE_EST)

def get_current_timestamp() -> str:
    """Real current moment as an ISO string with the New York offset, e.g. '2024-06-15T14:30:00.123456-04:00'."""
    return est_now().isoformat()
