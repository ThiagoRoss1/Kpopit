import os
from services.idol_service import IdolService
from services.game_service import GameService
from services.user_service import UserService
from utils.dates import get_today_date_str, get_current_timestamp
from utils.game_feedback_logic import partial_feedback_function, numerical_feedback_function
from utils.analytics import get_analytics_data, get_country_name
from services.get_db import get_db, get_idol_repo
from dotenv import load_dotenv

load_dotenv()
FLASK_ENV = os.getenv("FLASK_ENV", "production")

from flask import Blueprint, request, jsonify

classic_bp = Blueprint('classic', __name__)

# Create daily idol route
@classic_bp.route("/game/classic/daily-idol")
def get_daily_idol():
    """Return the 'Idol of the Day' data as JSON"""
    repository = get_idol_repo()

    # Start db connection
    connect = get_db()
    cursor = connect.cursor()

    idol_service = IdolService(connect, repository)

    # Choose idol of the day 
    idol_id = idol_service.choose_idol_of_the_day(cursor, gamemode_id=1)
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
    if group_id:
        group_companies = repository.fetch_group_companies(group_id)
        idol_data_dict["group_companies"] = group_companies
    else:
        idol_data_dict["group_companies"] = []

    # Debug print
    if FLASK_ENV == "development":
        print("\n -- ENTIRE IDOL DATA DICT --")
        print(idol_data_dict)
        print(" ------------------------\n")

    # Add career data 
    idol_career_for_groups = repository.fetch_full_idol_career(idol_id)
    groups = [career["group_name"] for career in idol_career_for_groups if career.get("is_active")]

    # User service - Streak reset
    user_service = UserService(connect)
    user_id = user_service.handle_user_streak(gamemode_id=1)

    if user_id:
        print(f"User {user_id} streak checked/updated for daily idol game.")
        
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
        # Image path for frontend to display
        "image_path": idol_data_dict.get("image_path"),
        "image_version": idol_data_dict.get("image_version"),
        # Server date for timezone consistency
        "server_date": get_today_date_str(),
        # "server_date": get_server_date(),
    }

    return jsonify(game_data)


# Create idol guess route
@classic_bp.route("/game/classic/guess", methods=["POST"])
def guess_idol():
    """Get idol guess and return comparison data as JSON"""

    data = request.get_json()
    guessed_idol_id = data.get("guessed_idol_id")
    answer_id = data.get("answer_id")
    user_token = data.get("user_token")
    current_attempt = data.get("current_attempt")
    game_date = data.get("game_date")
    analytics_data = get_analytics_data()
    country_name, flag = get_country_name(analytics_data.get("country"))
    analytics_data['country'] = f"{country_name} {flag}"

    today = get_today_date_str()

    if game_date != today:
        return jsonify({"error": "Game date mismatch"}), 400

    if not guessed_idol_id or not answer_id:
        return jsonify({"error": "Missing guessed_idol_id or answer_id"}), 400
    
    if not user_token:
        return jsonify({"error": "Missing user token"}), 400

    # Start db connection
    connect = get_db()
    cursor = connect.cursor()
    repository = get_idol_repo()

    game_service = GameService(connect, repository)

    # Validate user token
    cursor.execute("""SELECT id FROM users WHERE token = ?""", (user_token,))
    user_row = cursor.fetchone()

    if not user_row:
        if FLASK_ENV == "development":
            print("Invalid user token provided:", user_token)
        return jsonify({"error": "Invalid user token"}), 400
    
    user_id = user_row["id"]

    # Fetch full data for guessed idol and answer idol
    guessed_idol = dict(repository.fetch_full_idol_data(guessed_idol_id))
    answer_data = dict(repository.fetch_full_idol_data(answer_id))

    for idol in [guessed_idol, answer_data]:

        idol_id = idol["idol_id"]
        group_id = idol.get("group_id")

        # Fetch careers and companies
        idol["career"] = repository.fetch_full_idol_career(idol_id)
        idol["companies"] = repository.fetch_idol_companies(idol_id)

        if group_id:
            idol["group_companies"] = repository.fetch_group_companies(group_id)
        else:
            idol["group_companies"] = []
    
        for field in ["nationality", "position"]:
            if idol.get(field) and isinstance(idol[field], str):
                idol[field] = [item.strip() for item in idol[field].split(",")]
            else:
                idol[field] = idol.get(field, [])

    # guessed_idol["group_companies"] = fetch_group_companies(cursor, group_id=guessed_idol["group_id"] if guessed_idol["group_id"] else None)
    # answer_data["group_companies"] = fetch_group_companies(cursor, group_id=answer_data["group_id"] if answer_data["group_id"] else None)

    if not guessed_idol or not answer_data:
        
        return jsonify({"error": "Idol not found"}), 404
    
    #  -- MOVED DOWN --
    
    # Compare data
    feedback = {}

    # Position
    position_guess = set(position.strip() for position in (guessed_idol.get("position", [])))
    position_answer = set(position.strip() for position in (answer_data.get("position", [])))

    feedback['position'] = partial_feedback_function(position_guess, position_answer)

    # Nationality
    idol_nationality_guess = set(nationality.strip() for nationality in (guessed_idol.get("nationality", [])))
    idol_nationality_answer = set(nationality.strip() for nationality in (answer_data.get("nationality", [])))

    feedback["nationality"] = partial_feedback_function(idol_nationality_guess, idol_nationality_answer)
    
    # Numbers - debut year, height, birth date, member count, generation...
    numerical_fields = ["idol_debut_year", "height", "birth_date", "member_count"] # removed "generation"
    numerical_feedback = numerical_feedback_function(guessed_idol, answer_data, numerical_fields)
    feedback.update(numerical_feedback)

    # Group
    group_guess = set(group["group_name"] for group in guessed_idol["career"])
    group_answer = set(group["group_name"] for group in answer_data["career"])

    feedback["groups"] = partial_feedback_function(group_guess, group_answer)

    # Companies
    idol_companies_guess = set(company["name"] for company in guessed_idol["companies"])
    group_companies_guess = set(company["name"] for company in guessed_idol["group_companies"])

    companies_guess = idol_companies_guess.union(group_companies_guess) # == idol_companies | group_companies

    idol_companies_answer = set(company["name"] for company in answer_data["companies"])
    group_companies_answer = set(company["name"] for company in answer_data["group_companies"])

    companies_answer = idol_companies_answer.union(group_companies_answer)

    feedback["companies"] = partial_feedback_function(companies_guess, companies_answer)

    """Unique Values - Feedback Check"""
    unique_fields = ["artist_name", "gender"]

    # Name and Gender
    for field in unique_fields:
        if guessed_idol.get(field) == answer_data.get(field):
            feedback[field] = {
                "status": "correct",
                "correct_items": [guessed_idol.get(field)],
                "incorrect_items": []
            }
        else:
            feedback[field] = {
                "status": "incorrect",
                "correct_items": [],
                "incorrect_items": [guessed_idol.get(field)]
            }

    # Final answer (correct or not)
    current_timestamp = get_current_timestamp()
    # today = get_server_date()

    # Update user history
    try:      
        is_correct = game_service.save_user_history(
            connect, cursor, user_id, 1, guessed_idol_id, answer_data, 
            answer_id, current_attempt, today, current_timestamp, analytics_data
        )

    except Exception as e:
        print(f"Error saving user history: {e}")
        return jsonify({"error": "Database error saving user history"}), 500

    keys_for_display = [
        "idol_id", "artist_name", "gender", "nationality", "idol_debut_year", 
        "birth_date", "height", "position", "image_path", "member_count" # just this for now
    ]

    data_for_display = {key: guessed_idol.get(key) for key in keys_for_display}

    """Extra datas"""

    # Groups data
    active_groups = [
        group["group_name"] for group in guessed_idol["career"]
              if group.get("is_active") == 1
    ]
    active_group_name = active_groups[0] if active_groups else None

    data_for_display["groups"] = [group["group_name"] for group in guessed_idol["career"]]
    data_for_display["active_group"] = active_group_name

    # Companies data
    idol_c = [company["name"] for company in guessed_idol["companies"]]
    group_c = [company["name"] for company in guessed_idol["group_companies"]]
    data_for_display["companies"] = idol_c + group_c

    # Response data
    response_data = {
        "guess_correct": is_correct,
        "feedback": feedback,
        "guessed_idol_data": data_for_display
    }

    return jsonify(response_data)