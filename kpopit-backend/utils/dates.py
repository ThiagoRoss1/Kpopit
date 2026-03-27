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

def get_today_now():
    if TEST_MODE:
        return datetime.now(TIMEZONE_EST) + timedelta(days=TEST_DATE_OFFSET)
    
    return datetime.now(TIMEZONE_EST)

def get_today_date():
    return get_today_now().date() # Example - Object Date - 2024-06-15 (Usage: Date Columns)

def get_today_date_str() -> str:
    return get_today_now().date().isoformat() # Example - String - '2024-06-15' (Usage: API responses, filenames, JSON/Logs)

def get_current_timestamp():
    return get_today_now().isoformat() # Example - ISO with timezone - '2024-06-15T14:30:00.123456-04:00' (Usage: API responses, database timestamps, timezone-aware logging)