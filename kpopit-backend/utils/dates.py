from datetime import datetime, timezone, timedelta, date
from zoneinfo import ZoneInfo

TIMEZONE_BRT = ZoneInfo('America/Sao_Paulo')
TIMEZONE_EST = ZoneInfo("America/New_York")
# return datetime.now(timezone.utc) -- EU
# return datetime.now(timezone.utc).date().isoformat() -- EU

TEST_MODE = False
TEST_DATE_OFFSET = 3 # Days to add/subtract (1 = tomorrow, -1 = yesterday)

def get_today_now():
    if TEST_MODE:
        return datetime.now(TIMEZONE_EST) + timedelta(days=TEST_DATE_OFFSET)
    
    return datetime.now(TIMEZONE_EST)

def get_today_date():
    return get_today_now().date()

def get_today_date_str() -> str:
    return get_today_now().date().isoformat()

def get_current_timestamp():
    return get_today_now().isoformat()