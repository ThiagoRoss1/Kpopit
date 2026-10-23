import logging
from flask import Blueprint, jsonify, request, g
from utils.auth_decorators import optional_auth
from services.get_db import get_db, get_idol_repo
from services.daily_draw import ensure_daily_picks
from services.user_service import UserService
from services.game_service import GameService
from services.idol_guess_service import IdolGuessService
from utils.dates import get_today_date_str, get_current_timestamp
from utils.analytics import get_analytics_data, get_country_name



blurry_bp = Blueprint('blurry', __name__)

logger = logging.getLogger(__name__)

@blurry_bp.route("/game/blurry/daily-idol", methods=["GET"])
def get_daily_blurry_idol():
    repository = get_idol_repo()
    connect = get_db()
    cursor = connect.cursor()

    try:
        # Today's idol (tomorrow's is drawn ahead and never returned)
        idol_id = ensure_daily_picks(cursor, gamemode_id=2)

        connect.commit()

        # For testing purposes, we can override the idol_id here
        # idol_id = 1

        idol_blurry_data = repository.fetch_blurry_idol_data(idol_id)

        if not idol_blurry_data:
            return jsonify({"error": "Idol not found"}), 404
        
        user_service = UserService(connect)
        user_id = user_service.handle_user_streak(gamemode_id=2)

        if user_id:
            logger.debug("Blurry streak checked")
        
        blurry_game_data = {
            "answer_id": idol_blurry_data["idol_id"],
            "artist_name": idol_blurry_data["artist_name"],
            "image_path": idol_blurry_data["image_path"],
            "image_version": idol_blurry_data["image_version"],
            "blur_image_path": idol_blurry_data["blur_image_path"],
            "blur_image_version": idol_blurry_data["blur_image_version"],
            "server_date": get_today_date_str()
        }

        return jsonify(blurry_game_data), 200
    
    finally:
        cursor.close()

@blurry_bp.route("/game/blurry/guess", methods=["POST"])
@optional_auth
def guess_blurry_idol():
    """Get idol guess and return comparison data as JSON"""

    # answer_id / current_attempt from the body are ignored: the server owns the answer and the count.
    data = request.get_json() or {}
    guessed_idol_id = data.get("guessed_idol_id")
    game_date = data.get("game_date")
    analytics_data = get_analytics_data() or {}
    country_name, flag = get_country_name(analytics_data.get("country"))
    analytics_data['country'] = f"{country_name} {flag}"

    # Start db connection
    connect = get_db()
    cursor = connect.cursor()

    try:
        today = get_today_date_str()
        current_timestamp = get_current_timestamp()

        if game_date != today:
            return jsonify({"error": "Game date mismatch"}), 400

        if not guessed_idol_id:
            return jsonify({"error": "Missing guessed_idol_id"}), 400

        repository = get_idol_repo()
        game_service = GameService(connect, repository)

        # Resolve user identity — JWT (header) takes priority over body token
        auth = g.auth

        if auth["source"] == "jwt":
            user_id = auth["user_id"]

        elif auth["source"] == "anonymous":
            cursor.execute("SELECT id FROM users WHERE token = %s", (auth["token"],))
            user_row = cursor.fetchone()

            if not user_row:
                return jsonify({"error": "Invalid user token"}), 400
            user_id = user_row["id"]

        else:
            # Legacy: body token for clients that don't set Authorization header
            user_token = data.get("user_token")

            if not user_token:
                return jsonify({"error": "Missing user_token"}), 400
            
            cursor.execute("SELECT id FROM users WHERE token = %s", (user_token,))
            user_row = cursor.fetchone()

            if not user_row:
                return jsonify({"error": "Invalid user token"}), 400
            
            user_id = user_row["id"]

        answer_id = game_service.resolve_answer_id(cursor, 2)
        if answer_id is None:
            return jsonify({"error": "Idol data not found"}), 400

        result = IdolGuessService(repository).blurry_result(int(guessed_idol_id), answer_id)
        if not result:
            return jsonify({"error": "Idol data not found"}), 400

        # Calculate score / if is correct and update user history
        try:
            is_correct, card_granted = game_service.save_user_history(
                connect, cursor, user_id, 2, guessed_idol_id, {}, answer_id,
                today, current_timestamp, analytics_data
            )
        
        except Exception:
            logger.exception("Error saving user history")
            return jsonify({"error": "Database error while saving user history"}), 500

        response_data = {**result, "guess_correct": is_correct, "card_granted": card_granted}

        return jsonify(response_data), 200
    
    except Exception:
        logger.exception("Error processing %s guess", "blurry")
        return jsonify({"error": "Could not process the guess"}), 500

    finally:
        cursor.close()