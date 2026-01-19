import sqlite3
import os
from datetime import datetime, timezone, timedelta, date
import random
from flask import Blueprint, jsonify, request, g
from dotenv import load_dotenv
from services.get_db import get_db, get_idol_repo
from services.idol_service import IdolService
from services.user_service import UserService

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
    }

    # Just if for test
    return jsonify(blurry_game_data), 200






