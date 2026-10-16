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

def get_today_now() -> datetime:
    """Returns the current date and time in the EST timezone. Example: datetime.datetime(2024, 6, 15, 14, 30, tzinfo=ZoneInfo('America/New_York'))."""
    if TEST_MODE:
        return datetime.now(TIMEZONE_EST) + timedelta(days=TEST_DATE_OFFSET)
    
    return datetime.now(TIMEZONE_EST)

def get_datetime_now_utc() -> datetime:
    """Returns the current date and time in UTC. Example: datetime.datetime(2024, 6, 15, 18, 30, tzinfo=ZoneInfo('UTC'))."""
    if TEST_MODE:
        return (datetime.now(timezone.utc) + timedelta(days=TEST_DATE_OFFSET))
    return datetime.now(timezone.utc)

def get_today_date() -> date:
    """Returns today's date in the EST timezone. Example: datetime.date(2024, 6, 15) - 2024-06-15."""
    return get_today_now().date() # Example - Object Date - 2024-06-15 (Usage: Date Columns)

def get_today_date_str() -> str:
    """Returns today's date as a string in ISO format (YYYY-MM-DD) in the EST timezone. Example: '2024-06-15'."""
    return get_today_now().date().isoformat() # Example - String - '2024-06-15' (Usage: API responses, filenames, JSON/Logs)

def get_current_timestamp() -> str:
    """Returns the current timestamp as a string in ISO format (YYYY-MM-DDTHH:MM:SS.ffffff±HH:MM) in the EST timezone. Example: '2024-06-15T14:30:00.123456-04:00'."""
    return get_today_now().isoformat() # Example - ISO with timezone - '2024-06-15T14:30:00.123456-04:00' (Usage: API responses, database timestamps, timezone-aware logging)