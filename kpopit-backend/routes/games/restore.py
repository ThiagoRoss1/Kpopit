from flask import Blueprint, jsonify, g
from utils.auth_decorators import optional_auth
from services.get_db import get_db, get_idol_repo
from services.restore_service import RestoreService
from utils.dates import get_today_date_str

restore_bp = Blueprint('restore', __name__)


@restore_bp.route("/game/restore-session", methods=["GET"])
@optional_auth
def restore_session():
    """Return today's game per gamemode for the caller: a logged-in user (Bearer JWT) or an
    anonymous one (bare UUID header), always scoped to that caller's own user.

    Used after login / claim and when an anonymous player's local storage was cleared, to
    rehydrate localStorage from the server's record of the day."""
    auth = g.auth
    if auth["source"] not in ("jwt", "anonymous"):
        return jsonify({"error": "Authentication required"}), 401

    today = get_today_date_str()
    connect = get_db()
    cursor = connect.cursor()

    try:
        if auth["source"] == "jwt":
            user_id = auth["user_id"]
        else:
            cursor.execute("SELECT id FROM users WHERE token = %s", (auth["token"],))
            user_row = cursor.fetchone()
            if not user_row:
                return jsonify({"error": "Invalid user token"}), 400
            user_id = user_row["id"]

        result = RestoreService(connect, get_idol_repo()).build(cursor, user_id, today)
        connect.commit()
        return jsonify(result), 200

    finally:
        cursor.close()
