from datetime import datetime, timezone, timedelta, date
from zoneinfo import ZoneInfo
import os
from dotenv import load_dotenv

load_dotenv()

TIMEZONE_BRT = ZoneInfo('America/Sao_Paulo')
TIMEZONE_EST = ZoneInfo("America/New_York")
# return datetime.now(timezone.utc) -- EU
# return datetime.now(timezone.utc).date().isoformat() -- EU

FLASK_ENV = os.getenv("FLASK_ENV", "production").lower()

if FLASK_ENV == "development":   
    TEST_MODE = False
    TEST_DATE_OFFSET = 3 # Days to add/subtract (1 = tomorrow, -1 = yesterday)
else:
    TEST_MODE = False
    TEST_DATE_OFFSET = 0

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