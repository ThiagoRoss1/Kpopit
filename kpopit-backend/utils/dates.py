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

# --- Game day (TEST_DATE_OFFSET applies in development) ---------------------
# Decide which daily puzzle, history day and streak day it is.

def get_today_now() -> datetime:
    """Returns the current game-day date and time in the EST timezone. Example: datetime.datetime(2024, 6, 15, 14, 30, tzinfo=ZoneInfo('America/New_York')).
    Shifted by TEST_DATE_OFFSET in development; use est_now()/utc_now() for real moments (tokens, expiries, created_at)."""
    if TEST_MODE:
        return datetime.now(TIMEZONE_EST) + timedelta(days=TEST_DATE_OFFSET)
    
    return datetime.now(TIMEZONE_EST)

def get_today_date() -> date:
    """Returns today's game date in the EST timezone. Example: datetime.date(2024, 6, 15) - 2024-06-15."""
    return get_today_now().date() # Example - Object Date - 2024-06-15 (Usage: Date Columns)

def get_today_date_str() -> str:
    """Returns today's game date as a string in ISO format (YYYY-MM-DD) in the EST timezone. Example: '2024-06-15'."""
    return get_today_now().date().isoformat() # Example - String - '2024-06-15' (Usage: API responses, filenames, JSON/Logs)

# --- Real time (never offset) ------------------------------------------------
# Token iat/exp, refresh/email/reset/transfer expiry, cooldown windows, created_at/updated_at, won_at/started_at.

def utc_now() -> datetime:
    """Returns the real current date and time in UTC, never offset. Example: datetime.datetime(2024, 6, 15, 18, 30, tzinfo=datetime.timezone.utc)."""
    return datetime.now(timezone.utc)

def est_now() -> datetime:
    """Returns the real current date and time in the EST timezone, never offset."""
    return datetime.now(TIMEZONE_EST)

def get_current_timestamp() -> str:
    """Returns the real current timestamp as an ISO string in the EST timezone, never offset. Example: '2024-06-15T14:30:00.123456-04:00'."""
    return est_now().isoformat() # Example - ISO with timezone - '2024-06-15T14:30:00.123456-04:00' (Usage: API responses, database timestamps, timezone-aware logging)
