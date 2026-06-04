from flask import Blueprint, g, jsonify, request

from services.album_service import AlbumService
from services.get_db import get_db
from services.user_service import UserService
from utils.auth_decorators import optional_auth
from utils.dates import get_today_date_str

pixelated_bp = Blueprint("pixelated", __name__)


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
        if not album:
            return jsonify({"error": "No album available for today"}), 404

        user_service = UserService(connect)
        user_service.handle_user_streak(gamemode_id=3)

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

        service = AlbumService(connect)
        result = service.process_guess(
            cursor, connect, user_id, int(guess_album_id), int(current_attempt), gamemode_id=3
        )
        if "error" in result:
            return jsonify(result), 400

        return jsonify(result), 200
    except Exception as exc:
        print(f"[pixelated] guess error: {exc}")
        return jsonify({"error": str(exc)}), 500
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
