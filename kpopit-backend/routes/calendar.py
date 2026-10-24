import logging
from flask import Blueprint, g, jsonify, request
from services.calendar_service import MODES, CalendarError, CalendarService
from services.get_db import get_db, get_idol_repo
from utils.analytics import get_analytics_data, get_country_name
from utils.auth_decorators import optional_auth

calendar_bp = Blueprint("calendar", __name__)

logger = logging.getLogger(__name__)


def _caller_id(cursor):
    """(user_id, None) for a logged-in or anonymous caller, else (None, error response)."""
    auth = g.auth
    if auth["source"] == "jwt":
        return auth["user_id"], None
    if auth["source"] != "anonymous":
        return None, (jsonify({"error": "Missing user token"}), 400)
    cursor.execute("SELECT id FROM users WHERE token = %s", (auth["token"],))
    row = cursor.fetchone()
    if not row:
        return None, (jsonify({"error": "Invalid user token"}), 400)
    return row["id"], None


@calendar_bp.route("/calendar/timeline", methods=["GET"])
@optional_auth
def calendar_timeline():
    """Every challenge day per mode with the caller's status (for the calendar page)."""
    connect = get_db()
    cursor = connect.cursor()
    try:
        user_id, error = _caller_id(cursor)
        if error:
            return error
        return jsonify(CalendarService(connect, get_idol_repo()).timeline(cursor, user_id)), 200
    finally:
        cursor.close()


@calendar_bp.route("/calendar/<mode>/<day>", methods=["GET"])
@optional_auth
def calendar_day(mode, day):
    """A past (or today's) challenge: puzzle, the caller's game, and the answer once finished."""
    if mode not in MODES:
        return jsonify({"error": "Not found"}), 404
    connect = get_db()
    cursor = connect.cursor()
    try:
        user_id, error = _caller_id(cursor)
        if error:
            return error
        result = CalendarService(connect, get_idol_repo()).day(cursor, user_id, mode, day)
        connect.commit()
        return jsonify(result), 200
    except CalendarError as err:
        return jsonify({"error": str(err)}), err.status
    finally:
        cursor.close()


@calendar_bp.route("/calendar/<mode>/<day>/guess", methods=["POST"])
@optional_auth
def calendar_guess(mode, day):
    """A guess on a challenge day; same response as the mode's live guess route."""
    if mode not in MODES:
        return jsonify({"error": "Not found"}), 404
    data = request.get_json() or {}
    guessed_id = data.get("guessed_album_id" if mode == "pixelated" else "guessed_idol_id")
    analytics_data = get_analytics_data() or {}
    country_name, flag = get_country_name(analytics_data.get("country"))
    analytics_data["country"] = f"{country_name} {flag}"

    connect = get_db()
    cursor = connect.cursor()
    try:
        user_id, error = _caller_id(cursor)
        if error:
            return error
        result = CalendarService(connect, get_idol_repo()).guess(cursor, user_id, mode, day, guessed_id, analytics_data)
        return jsonify(result), 200
    except CalendarError as err:
        connect.rollback()
        return jsonify({"error": str(err)}), err.status
    except Exception:
        connect.rollback()
        logger.exception("Error processing a calendar guess")
        return jsonify({"error": "Could not process the guess"}), 500
    finally:
        cursor.close()
