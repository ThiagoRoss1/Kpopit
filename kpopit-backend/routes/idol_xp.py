import logging
import psycopg
from flask import Blueprint, g, jsonify, request
from services.get_db import get_db
from services.xp_service import XpError, XpService
from utils.auth_decorators import optional_auth, require_auth
from utils.rate_limiter import limiter

idol_xp_bp = Blueprint("idol_xp", __name__)

logger = logging.getLogger(__name__)


@idol_xp_bp.route("/idol-xp/select", methods=["POST"])
@require_auth
@limiter.limit("30 per minute")
def select_idol():
    """Select the idol that receives the XP of the caller's next completed games (account only)."""
    data = request.get_json() or {}
    connect = get_db()
    cursor = connect.cursor()
    try:
        selection = XpService(connect).select(cursor, g.auth["user_id"], data.get("idol_id"))
        connect.commit()
        return jsonify(selection), 200
    except XpError as err:
        connect.rollback()
        return jsonify({"error": str(err)}), err.status
    except psycopg.errors.UniqueViolation:
        # Another selection landed at the same moment; the database kept exactly one current idol.
        connect.rollback()
        return jsonify({"error": "Selection changed, try again"}), 409
    except Exception:
        connect.rollback()
        logger.exception("Failed to select an idol")
        return jsonify({"error": "Could not select the idol"}), 500
    finally:
        cursor.close()


@idol_xp_bp.route("/idol-xp/selection", methods=["GET"])
@require_auth
def current_selection():
    connect = get_db()
    cursor = connect.cursor()
    try:
        return jsonify({"current": XpService(connect).current_selection(cursor, g.auth["user_id"])}), 200
    finally:
        cursor.close()


@idol_xp_bp.route("/idol-xp/state", methods=["GET"])
@optional_auth
def xp_state():
    """XP per idol, levels, the current idol and the potion. Anonymous players only fill the potion,
    so they only get its amount."""
    connect = get_db()
    cursor = connect.cursor()
    try:
        auth = g.auth
        service = XpService(connect)
        if auth["source"] == "jwt":
            return jsonify(service.state(cursor, auth["user_id"])), 200
        if auth["source"] != "anonymous":
            return jsonify({"error": "Missing user token"}), 400
        cursor.execute("SELECT id FROM users WHERE token = %s", (auth["token"],))
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Invalid user token"}), 400
        state = service.state(cursor, row["id"])
        return jsonify({"potion": state["potion"]}), 200
    finally:
        cursor.close()
