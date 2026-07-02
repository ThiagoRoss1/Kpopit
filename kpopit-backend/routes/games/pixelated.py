from flask import Blueprint, g, jsonify, request
from services.album_service import AlbumService
from services.get_db import get_db
from services.user_service import UserService
from utils.analytics import get_analytics_data, get_country_name
from utils.auth_decorators import optional_auth
from utils.dates import get_today_date_str
import logging

pixelated_bp = Blueprint("pixelated", __name__)

logger = logging.getLogger(__name__)

@pixelated_bp.route("/game/pixelated/daily-album", methods=["GET"])
def get_daily_pixelated_album():
    """Return today's pixelated album cover."""
    connect = get_db()
    cursor = connect.cursor()

    try:
        service = AlbumService(connect)
        service.choose_album_of_the_day(cursor, gamemode_id=3)
        connect.commit()

        album = service.get_daily_album(cursor, gamemode_id=3)
        # For testing - Force a specific album of the day
        # album = service.get_album_by_id(cursor, album_id=1)

        if not album:
            return jsonify({"error": "No album available for today"}), 404

        user_service = UserService(connect)
        user_id = user_service.handle_user_streak(gamemode_id=3)

        if user_id:
            print(f"User {user_id} streak checked/updated for pixelated gamemode.")
            
        return jsonify({
            "answer_id": album["album_id"],
            "group_name": album["group_name"],
            "cover_path": album["cover_path"],
            "palette": album["palette"],
            "type": album["type"],
            "release_year": album["release_year"],
            "server_date": get_today_date_str(),
        }), 200
    finally:
        cursor.close()


@pixelated_bp.route("/game/pixelated/guess", methods=["POST"])
@optional_auth
def guess_pixelated_album():
    data = request.get_json() or {}
    guess_album_id = data.get("album_id") or data.get("guessed_album_id")
    current_attempt = data.get("current_attempt")
    game_date = data.get("game_date")

    if game_date and game_date != get_today_date_str():
        return jsonify({"error": "Game date mismatch"}), 400
    if not guess_album_id or not current_attempt:
        return jsonify({"error": "Missing album_id or current_attempt"}), 400

    connect = get_db()
    cursor = connect.cursor()
    try:
        auth = g.auth
        if auth["source"] == "jwt":
            user_id = auth["user_id"]
        elif auth["source"] == "anonymous":
            cursor.execute("SELECT id FROM users WHERE token = %s", (auth["token"],))
            row = cursor.fetchone()
            if not row:
                return jsonify({"error": "Invalid user token"}), 400
            user_id = row["id"]
        else:
            user_token = data.get("user_token")
            if not user_token:
                return jsonify({"error": "Missing user_token"}), 400
            cursor.execute("SELECT id FROM users WHERE token = %s", (user_token,))
            row = cursor.fetchone()
            if not row:
                return jsonify({"error": "Invalid user token"}), 400
            user_id = row["id"]

        analytics_data = get_analytics_data() or {}
        country_name, flag = get_country_name(analytics_data.get("country"))
        analytics_data['country'] = f"{country_name} {flag}"

        service = AlbumService(connect)
        result = service.process_guess(
            cursor, connect, user_id, int(guess_album_id), int(current_attempt),
            analytics_data, gamemode_id=3,
        )
        if "error" in result:
            return jsonify(result), 400

        return jsonify(result), 200
    except Exception:
        logger.exception("[pixelated] guess error")
        return jsonify({"error": "Internal server error"}), 500
    finally:
        cursor.close()


@pixelated_bp.route("/game/pixelated/albums-list", methods=["GET"])
def list_albums():
    """All published albums (cached + filtered client-side, like /idols-list)."""
    connect = get_db()
    cursor = connect.cursor()
    try:
        service = AlbumService(connect)
        return jsonify(service.get_all_albums(cursor)), 200
    finally:
        cursor.close()
