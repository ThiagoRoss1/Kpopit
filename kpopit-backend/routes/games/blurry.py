import sqlite3
import os
from datetime import datetime, timezone, timedelta, date
import random
from flask import Blueprint, jsonify, request, g
from dotenv import load_dotenv
from services.get_db import get_db, get_idol_repo
from services.idol_service import IdolService
from services.user_service import UserService
from services.game_service import GameService
from utils.dates import get_today_date_str, get_current_timestamp
from utils.analytics import get_analytics_data, get_country_name

load_dotenv()

DB_FILE = os.getenv("DB_FILE")
FLASK_ENV = os.getenv("FLASK_ENV")

blurry_bp = Blueprint('blurry', __name__)

@blurry_bp.route("/game/blurry/daily-idol", methods=["GET"])
def get_daily_blurry_idol():
    repository = get_idol_repo()
    connect = get_db()
    cursor = connect.cursor()

    idol_service = IdolService(connect, repository)

    # Choose idol of the day
    idol_id = idol_service.choose_idol_of_the_day(cursor, gamemode_id=2)

    connect.commit()

    # For testing purposes, we can override the idol_id here
    # idol_id = 1

    idol_blurry_data = repository.fetch_blurry_idol_data(idol_id)

    if not idol_blurry_data:
        return jsonify({"error": "Idol not found"}), 404
    
    user_service = UserService(connect)
    user_id = user_service.handle_user_streak(gamemode_id=2)

    if user_id:
        print(f"User {user_id} streak checked/updated for blurry gamemode.")
    
    if FLASK_ENV == "development":
        print("\n -- ENTIRE IDOL DICT --")
        print(idol_blurry_data)
        print(" ------------------------\n")

    blurry_game_data = {
        "answer_id": idol_blurry_data["idol_id"],
        "artist_name": idol_blurry_data["artist_name"],
        "image_path": idol_blurry_data["image_path"],
        "blur_image_path": idol_blurry_data["blur_image_path"],
        "server_date": get_today_date_str()
    }

    # Just if for test
    return jsonify(blurry_game_data), 200

@blurry_bp.route("/game/blurry/guess", methods=["POST"])
def guess_blurry_idol():
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
    current_timestamp = get_current_timestamp()

    if game_date != today:
        return jsonify({"error": "Game date mismatch"}), 400
    
    if not guessed_idol_id or not answer_id:
        return jsonify({"error": "Missing guessed_idol_id or answer_id"}), 400
    
    if not user_token:
        return jsonify({"error": "Missing user_token"}), 400
    
    # Start db connection
    connect = get_db()
    cursor = connect.cursor()
    repository = get_idol_repo()

    game_service = GameService(connect, repository)

    cursor.execute("""SELECT id FROM users WHERE token = ?""", (user_token,))
    user_row = cursor.fetchone()

    if not user_row:
        return jsonify({"error": "Invalid user token"}), 400
    
    user_id = user_row["id"]

    guessed_idol = dict(repository.fetch_full_idol_data(guessed_idol_id))
    answer_data = dict(repository.fetch_full_idol_data(answer_id))

    if not guessed_idol or not answer_data:
        return jsonify({"error": "Idol data not found"}), 400
    
    feedback = {}

    fields = ["idol_id", "artist_name"]

    for field in fields:
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

    # Calculate score / if is correct and update user history
    try:
        is_correct = game_service.save_user_history(
            connect, cursor, user_id, 2, guessed_idol_id, answer_data, 
            answer_id, current_attempt, today, current_timestamp, analytics_data
        )
    
    except Exception as e:
        print(f"Error saving user history: {e}")
        return jsonify({"error": "Database error while saving user history"}), 500
    
    # Prepare for display
    keys_for_display = [
        "idol_id", "artist_name", "image_path"
    ]

    data_for_display = {key: guessed_idol.get(key) for key in keys_for_display}

    # Response data
    response_data = {
        "guess_correct": is_correct,
        "feedback": feedback,
        "guessed_idol_data": data_for_display
    }

    return jsonify(response_data), 200
    




