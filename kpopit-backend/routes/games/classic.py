import logging
from flask import Blueprint, request, jsonify, g
from services.daily_draw import ensure_daily_picks
from services.game_service import GameService
from services.user_service import UserService
from utils.dates import get_today_date_str, get_current_timestamp
from services.idol_guess_service import IdolGuessService
from utils.analytics import get_analytics_data, get_country_name
from services.get_db import get_db, get_idol_repo
from utils.auth_decorators import optional_auth


classic_bp = Blueprint('classic', __name__)

logger = logging.getLogger(__name__)

# Create daily idol route
@classic_bp.route("/game/classic/daily-idol")
def get_daily_idol():
    """Return the 'Idol of the Day' data as JSON"""
    repository = get_idol_repo()

    # Start db connection
    connect = get_db()
    cursor = connect.cursor()

    try:
        # Today's idol (tomorrow's is drawn ahead and never returned)
        idol_id = ensure_daily_picks(cursor, gamemode_id=1)
        connect.commit()

        """ For testing purposes, you can set a fixed idol_id """
        # idol_id = 1

        # Fetch full idol data
        idol_data = repository.fetch_full_idol_data(idol_id)

        if not idol_data:     
            return jsonify({"error": "Idol not found"}), 404
        
        idol_data_dict = dict(idol_data)

        # Fetch idol companies
        idol_data_dict["companies"] = repository.fetch_idol_companies(idol_id)

        # Fetch group companies
        group_id = idol_data_dict["group_id"]
        is_former_group = idol_data_dict.get("is_former_group", False)
        if group_id:
            group_companies = repository.fetch_group_companies(group_id)
            idol_data_dict["group_companies"] = group_companies
        else:
            idol_data_dict["group_companies"] = []

        # Add career data 
        idol_career_for_groups = repository.fetch_full_idol_career(idol_id)
        groups = [career["group_name"] for career in idol_career_for_groups if career.get("is_active")]
        # No active group: hint with the most recent past group instead of "Soloist"
        if not groups and is_former_group:
            groups = [idol_data_dict["group_name"]]

        # User service - Streak reset
        user_service = UserService(connect)
        user_id = user_service.handle_user_streak(gamemode_id=1)

        if user_id:
            logger.debug("Classic streak checked")
            
        # Filter data 
        game_data = {
            "answer_id": idol_data_dict["idol_id"],
            
            # Get idol infos (safe to browser)
            "categories": [
                "Artist Name", "Gender", "Group", "Companies", "Nationality", 
                "Debut Year", "Birth Date", "Height", "Position",
            ],
            ## "reveal_info" -- TODO later // TODO - nationalities can be + than 1
            "member_count": idol_data_dict.get("member_count"),
            # TODO groups - same as Group but organizing better for frontend
            "groups": groups,
            "is_former_group": is_former_group,
            # Image path for frontend to display
            "image_path": idol_data_dict.get("image_path"),
            "image_version": idol_data_dict.get("image_version"),
            # Server date for timezone consistency
            "server_date": get_today_date_str(),
            # "server_date": get_server_date(),
        }

        return jsonify(game_data)
    
    finally:
        cursor.close()

# Create idol guess route
@classic_bp.route("/game/classic/guess", methods=["POST"])
@optional_auth
def guess_idol():
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
                return jsonify({"error": "Missing user token"}), 400
            
            cursor.execute("SELECT id FROM users WHERE token = %s", (user_token,))
            user_row = cursor.fetchone()

            if not user_row:
                logger.debug("Invalid user token rejected")

                return jsonify({"error": "Invalid user token"}), 400
            
            user_id = user_row["id"]

        answer_id = game_service.resolve_answer_id(cursor, 1)
        if answer_id is None:
            return jsonify({"error": "Idol not found"}), 404

        result = IdolGuessService(repository).classic_result(int(guessed_idol_id), answer_id)
        if not result:
            return jsonify({"error": "Idol not found"}), 404

        try:
            is_correct, card_granted = game_service.save_user_history(
                connect, cursor, user_id, 1, guessed_idol_id, {}, answer_id,
                today, get_current_timestamp(), analytics_data
            )

        except Exception:
            logger.exception("Error saving user history")
            return jsonify({"error": "Database error saving user history"}), 500

        response_data = {**result, "guess_correct": is_correct, "card_granted": card_granted}

        return jsonify(response_data), 200
    
    except Exception:
        logger.exception("Error processing %s guess", "classic")
        return jsonify({"error": "Could not process the guess"}), 500
    finally:
        cursor.close()
