import json
from flask import Blueprint, jsonify, g
from utils.auth_decorators import require_auth
from services.get_db import get_db
from utils.dates import get_today_date_str

restore_bp = Blueprint('restore', __name__)

GAMEMODES = [(1, "classic"), (2, "blurry")]


@restore_bp.route("/game/restore-session", methods=["GET"])
@require_auth
def restore_session():
    """Return today's saved game state for the authenticated user, per gamemode.

    Used by the frontend after login / claim to rehydrate localStorage with
    in-progress (or completed) state recorded from any previous device.
    """
    user_id = g.auth["user_id"]
    today = get_today_date_str()

    connect = get_db()
    cursor = connect.cursor()

    try:
        result = {"server_date": today, "classic": None, "blurry": None}

        for gamemode_id, key in GAMEMODES:
            cursor.execute(
                """
                    SELECT game_state
                    FROM daily_user_history
                    WHERE user_id = %s AND date = %s AND gamemode_id = %s
                """,
                (user_id, today, gamemode_id),
            )
            row = cursor.fetchone()

            if not row or not row.get("game_state"):
                continue

            state = row["game_state"]
            if isinstance(state, str):
                try:
                    state = json.loads(state)
                    
                except (TypeError, ValueError):
                    continue

            result[key] = state

        return jsonify(result), 200

    finally:
        cursor.close()
