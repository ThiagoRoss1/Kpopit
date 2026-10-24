from datetime import timedelta
from flask import Blueprint, jsonify, g
from services.calendar_service import CALENDAR_ENABLED
from services.get_db import get_db
from services.yesterday_service import YesterdayService
from utils.auth_decorators import optional_auth
from utils.dates import get_today_date

game_logic_bp = Blueprint('game_logic', __name__)

FIRST_DAY = {"message": "First day - no yesterday pick to store"}


def _locked_for_caller(cursor, gamemode_id: int):
    """With the calendar on, yesterday's answer is only for players who finished that day; the rest
    get a flag to offer playing it in the calendar. None means the answer may be shown."""
    if not CALENDAR_ENABLED:
        return None
    yesterday = (get_today_date() - timedelta(days=1)).isoformat()
    auth = g.auth
    user_id = auth["user_id"] if auth["source"] == "jwt" else None
    if auth["source"] == "anonymous":
        cursor.execute("SELECT id FROM users WHERE token = %s", (auth["token"],))
        row = cursor.fetchone()
        user_id = row["id"] if row else None
    if user_id is not None:
        cursor.execute(
            "SELECT 1 FROM daily_user_history WHERE user_id = %s AND date = %s AND gamemode_id = %s AND won = TRUE",
            (user_id, yesterday, gamemode_id),
        )
        if cursor.fetchone():
            return None
    return {"yesterdays_pick_date": yesterday, "locked": True, "play_in_calendar": True}


# Store yesterdays idol pick
@game_logic_bp.route("/store-yesterdays-idol")
@optional_auth
def store_yesterdays_idol():
    """Store yesterday's idol pick in the database"""
    connect = get_db()
    cursor = connect.cursor()
    try:
        result = YesterdayService(connect).store_yesterdays_idol(cursor, g.gamemode_id)
        if result is None:
            return jsonify(FIRST_DAY)
        return jsonify(_locked_for_caller(cursor, g.gamemode_id) or result)
    finally:
        cursor.close()

@game_logic_bp.route("/store-yesterdays-album")
@optional_auth
def store_yesterdays_album():
    """Store yesterday's album pick in the database"""
    connect = get_db()
    cursor = connect.cursor()
    try:
        result = YesterdayService(connect).store_yesterdays_album(cursor, g.gamemode_id)
        if result is None:
            return jsonify(FIRST_DAY)
        return jsonify(_locked_for_caller(cursor, g.gamemode_id) or result)
    finally:
        cursor.close()
