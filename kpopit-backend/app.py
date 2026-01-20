import sqlite3
import os
from datetime import datetime, timezone, timedelta, date
from zoneinfo import ZoneInfo
import random
from flask import Flask, jsonify, request, redirect, session, g
from flask_cors import CORS
import uuid
import math
import secrets
import json
from routes.admin import admin_bp
from routes.tasks import tasks_bp
from dotenv import load_dotenv
from utils.dates import (get_today_now, get_today_date, get_today_date_str, get_current_timestamp)
from utils.game_feedback_logic import partial_feedback_function, numerical_feedback_function
from services.get_db import get_db, get_idol_repo, init_app
from services.user_service import UserService
from services.idol_service import IdolService
from services.game_service import GameService
from repositories.idol_repository import IdolRepository
from routes.games.blurry import blurry_bp
# from flask_babel import Babel
# from flask_session import Session
load_dotenv()

# Global variables
DB_FILE = os.getenv("DB_FILE")
ADMIN_ENABLED = os.getenv("ADMIN_ENABLED", "false").lower() == "true"
FLASK_ENV = os.getenv("FLASK_ENV", "production").lower()
FRONTEND_URL = os.getenv("FRONTEND_URL")

app = Flask(__name__)

init_app(app)

if FLASK_ENV == "development":
    CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins for static files

else:
    urls_string = FRONTEND_URL if FRONTEND_URL else ""
    frontend_urls = urls_string.split(",")
    CORS(app, resources={r"/*": {"origins": frontend_urls}}) # Restrict to frontend URL
    

# Admin blueprint - Register routes
if ADMIN_ENABLED:
    app.register_blueprint(admin_bp)

# Tasks blueprint - Backup route
app.register_blueprint(tasks_bp, url_prefix='/api')

# Blurry game blueprint - Register routes
app.register_blueprint(blurry_bp, url_prefix="/api")


# class Config:
#     # Configure session
#     LANGUAGES = ['en'] # Just english for now
#     BABEL_DEFAULT_LOCALE = 'en'

# app.config.from_object(Config)
# babel = Babel(app)
# Session(app)

# Do it later for repositories 
# @app.before_request
# def load_repositories():
#     g.repository = get_idol_repo()

# Create daily idol route
@app.route("/api/game/daily-idol")
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
        # Server date for timezone consistency
        "server_date": get_today_date_str(),
        # "server_date": get_server_date(),
    }

    return jsonify(game_data)


# Create idol guess route
@app.route("/api/game/guess", methods=["POST"])
def guess_idol():
    """Get idol guess and return comparison data as JSON"""

    data = request.get_json()
    guessed_idol_id = data.get("guessed_idol_id")
    answer_id = data.get("answer_id")
    user_token = data.get("user_token")
    current_attempt = data.get("current_attempt")
    game_date = data.get("game_date")

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
            answer_id, current_attempt, today, current_timestamp
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

# Create idol list (For frontend check, list, dropdown...)
@app.route("/api/idols-list", methods=["GET"])
def get_idols_list():
    """Return a list of all idols with their id and names as JSON"""
    
    # Start db connection
    connect = get_db()
    cursor = connect.cursor()

    # Fetch all idols data
    idol_query = """
        SELECT DISTINCT
            i.id,
            i.artist_name, 
            i.image_path,
            i.gender,
            i.debut_year AS idol_debut_year,
            i.nationality,
            i.birth_date,
            i.height,
            i.position,
            b.blur_image_path
            FROM idols AS i
            LEFT JOIN blurry_mode_data AS b ON i.id = b.idol_id AND b.is_active = 1
            WHERE i.is_published = 1 
            ORDER BY artist_name ASC
    """
    cursor.execute(idol_query)
    results = cursor.fetchall()

    idols_list = [dict(row) for row in results]

    member_count_query = """
            SELECT ic.idol_id, g.member_count
            FROM idol_career AS ic
            JOIN groups AS g ON ic.group_id = g.id
            JOIN (
                -- Subquery to get the first / main group for each idol
                SELECT idol_id, MIN(start_year) as first_start_year
                FROM idol_career
                WHERE is_active = 1
                GROUP BY idol_id
            ) AS main_group
            ON ic.idol_id = main_group.idol_id
            AND ic.start_year = main_group.first_start_year
            WHERE ic.is_active = 1
    """
    cursor.execute(member_count_query)
    member_count_results = cursor.fetchall()

    idol_member_counts = {row["idol_id"]: row["member_count"] for row in member_count_results}

    groups_query = """
        SELECT ic.idol_id, g.name AS group_name
        FROM idol_career AS ic
        JOIN groups AS g ON ic.group_id = g.id
        WHERE ic.is_active = 1
    """
    cursor.execute(groups_query)
    results = cursor.fetchall()

    idol_groups_active = {}

    for row in results:
        idol_groups_active.setdefault(row["idol_id"], []).append(row["group_name"])

    groups_query_all = """
        SELECT ic.idol_id, g.name AS group_name
        FROM idol_career AS ic
        JOIN groups AS g ON ic.group_id = g.id
    """
    cursor.execute(groups_query_all)
    results = cursor.fetchall()

    idol_groups_all = {}
    for row in results:
        idol_groups_all.setdefault(row["idol_id"], []).append(row["group_name"])

    companies_query = """
        SELECT
            ic.idol_id,
            c.name AS company_name
            FROM idol_company_affiliation AS ic
            JOIN companies AS c ON ic.company_id = c.id

        UNION

        SELECT
            icar.idol_id,
            c.name AS company_name
            FROM idol_career AS icar
            JOIN group_company_affiliation AS gca ON icar.group_id = gca.group_id
            JOIN companies AS c ON gca.company_id = c.id
            WHERE icar.is_active = 1
        """
    cursor.execute(companies_query)
    results = cursor.fetchall()

    idol_companies = {}
    for row in results:
        idol_companies.setdefault(row["idol_id"], []).append(row["company_name"])

    for idol in idols_list:
        idol_id = idol["id"]
        idol["groups"] = list(set(idol_groups_all.get(idol_id, [])))
        idol["all_groups"] = idol["groups"]
        idol["active_group"] = ", ".join(set(idol_groups_active.get(idol_id, []))) or None
        idol["companies"] = list(set(idol_companies.get(idol_id, [])))
        idol["member_count"] = idol_member_counts.get(idol_id)

        for field in ["nationality", "position"]:
            if field in idol and isinstance(idol[field], str) and idol[field]:
                idol[field] = [item.strip() for item in idol[field].split(",")]
            elif field not in idol or idol[field] is None:
                idol[field] = []

    

    return jsonify(idols_list)

# Store yesterdays idol pick
@app.route("/api/store-yesterdays-idol")
def store_yesterdays_idol():
    """Store yesterday's idol pick in the database"""
    
    # Start db connection
    connect = get_db()
    cursor = connect.cursor()

    # Gey yesterday's date

    yesterday = get_today_date() - timedelta(days=1)
    yesterday_str = yesterday.isoformat()

    # Get idol id for yesterday
    select_sql = """
        SELECT idol_id FROM daily_picks WHERE pick_date = ?
    """
    cursor.execute(select_sql, (yesterday_str,))
    result = cursor.fetchone()


    if result:
        # Insert or Update yesterday's pick
        insert_sql = """
            INSERT INTO yesterday_picks (past_idol_id, yesterdays_pick_date)
            VALUES (?, ?)
            ON CONFLICT(yesterdays_pick_date)
            DO UPDATE SET past_idol_id = excluded.past_idol_id
        """
        cursor.execute(insert_sql, (result["idol_id"], yesterday_str))

        connect.commit()
    
        # --- Fetch idol name ---
        name_sql = """
            SELECT artist_name FROM idols WHERE id = ?
        """
        cursor.execute(name_sql, (result["idol_id"],))
        artist_name = cursor.fetchone()["artist_name"]

        # --- Fetch idol group ---
        group_sql = """
            SELECT g.name FROM groups AS g
            LEFT JOIN idol_career AS ic ON g.id = ic.group_id
            WHERE ic.idol_id = ? AND ic.is_active = 1
        """

        # Remove left join after testing (not all idols have a career entry)

        cursor.execute(group_sql, (result["idol_id"],))
        group_result = cursor.fetchone()

         # --- Fetch idol image ---
        image_sql = """
            SELECT image_path FROM idols WHERE id = ?
        """

        cursor.execute(image_sql, (result["idol_id"],))
        image_result = cursor.fetchone()
        image_path = image_result["image_path"] if image_result else None

        

        return jsonify({
            "past_idol_id": result["idol_id"], 
            "yesterdays_pick_date": yesterday_str,
            "artist_name": artist_name,
            "groups": [group_result["name"]] if group_result else [],
            "image_path": image_path
        })

    else:
        
        return jsonify({"message": "First day - no yesterday pick to store"})


# Get reset timer for next idol
@app.route("/api/reset-timer")
def get_reset_timer():
    """Return the time remaining until the next daily idol reset"""
    
    time = get_today_now()
    
    next_reset = time.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    
    time_remaining = next_reset - time
    
    # Convert to total seconds for easy frontend calculation
    total_seconds = int(time_remaining.total_seconds())
    
    # Break down into hours, minutes, seconds
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60

    display_keys = {
        "total_seconds": total_seconds,
        "hours": hours,
        "minutes": minutes,
        "seconds": seconds,
        "next_reset": next_reset.isoformat()
    }
    
    return jsonify(display_keys)

# Generate a new user token and stores it in the database
@app.route("/api/user/init", methods=["POST"])
def generate_user_token():
    """Generate a new user token and store it in the database"""
    token_sucessfuly_generated = False
    current_timestamp = get_current_timestamp()

    # Try up to 5 times
    attempts = 0
    error = ""

    while not token_sucessfuly_generated and attempts < 5:
        connect = None
        try:
            token = str(uuid.uuid4())

            # Start db connection 
            connect = get_db()
            cursor = connect.cursor()
            
            token_insert_sql = """
                INSERT INTO users (token, created_at) VALUES (?, ?)
            """
            cursor.execute(token_insert_sql, (token, current_timestamp))
            connect.commit()
            
            token_sucessfuly_generated = True
    
        except sqlite3.IntegrityError as e:
            attempts += 1
            print(f"Token generation attempt {attempts} failed: {e}")
            error += str(e)

        except Exception as e:
            attempts += 1
            print(f"Token generation attempt {attempts} failed: {e}")
            error += str(e)
        

    if token_sucessfuly_generated:
        return jsonify({"token": token})
    else:
        return jsonify({"error": "Failed to generate unique token after 5 attempts", "details": error}), 500
    
@app.route("/api/stats/<user_token>", methods=["GET"])
def get_user_stats(user_token):
    """Return user stats based on the provided token"""

    # Start db connection
    connect = get_db()
    cursor = connect.cursor()

    # Validate user token 
    cursor.execute("""
            SELECT id FROM users WHERE token = ?
        """, (user_token,))
    
    user_row = cursor.fetchone()

    if not user_row:
        
        return jsonify({"error": "Invalid user token"}), 400
    
    user_id = user_row["id"]

    # Fetch user stats 
    cursor.execute("""
            SELECT current_streak, max_streak, wins_count, average_guesses, one_shot_wins
            FROM user_history
            WHERE user_id = ?
        """, (user_id,))
    
    stats_row = cursor.fetchone()

    if stats_row:
        user_stats = dict(stats_row)
    else:
        user_stats = {
            "current_streak": 0,
            "max_streak": 0,
            "wins_count": 0,
            "average_guesses": 0.0,
            "one_shot_wins": 0
        }
    

    return jsonify(user_stats)

@app.route("/api/daily-users-count", methods=["GET"])
def get_daily_users_count():
    """Return the count of users who played today's game"""

    today = get_today_date_str()
    # today = get_server_date()

    connect = get_db()
    cursor = connect.cursor()

    cursor.execute("""
            SELECT COUNT(DISTINCT user_id) AS user_count
            FROM daily_user_history
            WHERE date = ? AND won = 1
        """, (today,))
    
    result = cursor.fetchone()
    
    
    user_count = result["user_count"] if result and result["user_count"] is not None else 0

    return jsonify({"user_count": user_count})

@app.route("/api/daily-rank/<user_token>", methods=["GET"])
def get_daily_rank(user_token):
    """Return the user's rank for today's game"""
    today = get_today_date_str()
    # today = get_server_date()

    connect = get_db()
    cursor = connect.cursor()

    # Validate user token
    cursor.execute("""
            SELECT id FROM users WHERE token = ?
        """, (user_token,))
    
    user_row = cursor.fetchone()

    if not user_row:
        
        return jsonify({"error": "Invalid user token"}), 400
    
    user_id = user_row["id"]

    # Get user's first guess time, guesses count and win time
    cursor.execute("""
            SELECT started_at, guesses_count, won_at FROM daily_user_history
            WHERE user_id = ? AND date = ? AND won = 1
        """, (user_id, today))
    
    result = cursor.fetchone()

    if not result or result["started_at"] is None or result["guesses_count"] is None or result["won_at"] is None:
        
        return jsonify({"rank": None, "message": "User has not finished today's game"}), 200
    
    started_at = result["started_at"]
    guesses_count = result["guesses_count"]
    won_at = result["won_at"]

    # Calculate time to win
    time_to_win = datetime.fromisoformat(won_at) - datetime.fromisoformat(started_at) # With python - (Can use julianday in SQL too)
    time_to_win_seconds = int(time_to_win.total_seconds())

    # Fetch ranks and count user's rank
    cursor.execute("""
            SELECT COUNT(*) + 1 AS position FROM daily_user_history
            WHERE date = ? AND won = 1 AND won_at < ?
        """, (today, won_at))
    
    position_result = cursor.fetchone()

    position = position_result["position"] if position_result else None

    # Fetch ranks and count user's rank
    cursor.execute("""
            SELECT COUNT(*) + 1 AS rank FROM daily_user_history
            WHERE date = ? AND won = 1 AND user_id != ?
            AND (guesses_count < ? 
            OR (guesses_count = ? AND (julianday(won_at) - julianday(started_at)) * 24 * 60 * 60 <= ?))
        """, (today, user_id, guesses_count, guesses_count, time_to_win_seconds))
    
    rank_result = cursor.fetchone()
    rank = rank_result["rank"] if rank_result else None

    # Get user's score
    cursor.execute("""
            SELECT score FROM daily_user_history
            WHERE user_id = ? AND date = ? AND won = 1
        """, (user_id, today))
    
    result = cursor.fetchone()
    user_score = result["score"] if result and result["score"] is not None else 0
    
    

    return jsonify({"position": position, "rank": rank, "score": user_score})

@app.route("/api/generate-transfer-code/<user_token>", methods=["POST"])
def generate_transfer_code(user_token):
    """Generate a transfer code for the user to transfer their data to another device"""
    code_generated = False
    # Start db connection

    connect = get_db()
    cursor = connect.cursor()

    current_timestamp = get_current_timestamp()

    # Validate user token
    cursor.execute("""
            SELECT id FROM users WHERE token = ?
        """, (user_token,))
    
    user_row = cursor.fetchone()

    if not user_row:
        
        return jsonify({"error": "Invalid user token"}), 400

    # today = get_server_date()
    
    # Delete expired codes
    cursor.execute("""
            DELETE FROM transfer_data
            WHERE expires_at < ?
        """, (current_timestamp,))

    # Generate unique transfer code
    attempts = 0
    error = ""
    while not code_generated and attempts < 5:
        try:
            # Guarantee uniqueness by checking existing codes
            cursor.execute("""
                    SELECT code, expires_at FROM transfer_data
                    WHERE user_token = ? AND expires_at >= ? AND used = 0
                """, (user_token, current_timestamp))
            existing_code = cursor.fetchone()

            if existing_code:
                
                return jsonify({
                    "transfer_code": existing_code["code"],
                    "expires_at": existing_code["expires_at"]
                    })


            code = f"{secrets.token_hex(2)[:3].upper()}-{secrets.token_hex(2)[:3].upper()}"
            expires_at = get_today_now() + timedelta(days=3)
            # expires_at = get_server_datetime_now() + datetime.timedelta(days=3)

            # Insert transfer code into database
            cursor.execute("""
                INSERT INTO transfer_data (user_token, code, created_at, expires_at)
                VALUES (?, ?, ?, ?)
            """, (user_token, code, current_timestamp, expires_at.isoformat()))
                
            connect.commit()
            code_generated = True
        
        except sqlite3.IntegrityError as e:
            attempts += 1
            print(f"Transfer code generation attempt {attempts} failed: {e}")
            error += str(e)

        except Exception as e:
            attempts += 1
            print(f"Transfer code generation attempt {attempts} failed: {e}")
            error += str(e)

    

    if code_generated:
        return jsonify({"transfer_code": code, "expires_at": expires_at.isoformat()})
    else:
        return jsonify({"error": "Failed to generate unique transfer code after 5 attempts", "details": error}), 500
    
@app.route("/api/transfer-data", methods=["POST"])
def transfer_data():
    """Transfer user data using a transfer code"""
    data = request.get_json()
    transfer_code = data.get("code")

    if not transfer_code:
        return jsonify({"error": "Missing transfer code"}), 400
    
    # Start db connection
    connect = get_db()
    cursor = connect.cursor()

    # Validate transfer code
    cursor.execute("""
            SELECT code, user_token, expires_at, used FROM transfer_data
            WHERE code = ?
        """, (transfer_code,))
        
    code_row = cursor.fetchone()

    if not code_row:
        
        return jsonify({"error": "Invalid transfer code"}), 400
    
    if code_row["used"]:
        
        return jsonify({"error": "Transfer code has already been used"}), 400
    
    expires_at = datetime.fromisoformat(code_row["expires_at"])
    if expires_at < get_today_now():
    # if expires_at < get_server_datetime_now():
        
        return jsonify({"error": "Transfer code has expired"}), 400
    
    user_token = code_row["user_token"]

    # Mark code as used
    cursor.execute("""
            UPDATE transfer_data
            SET used = 1
            WHERE code = ? AND used = 0
        """, (transfer_code,))
    connect.commit()
    

    return jsonify({"user_token": user_token})

@app.route("/api/game-state/<user_token>", methods=["GET", "POST"])
def get_game_state(user_token):
    """Return the current game state for the user"""
    today = get_today_date_str()
    # today = get_server_date()

    # Start db connection
    connect = get_db()
    cursor = connect.cursor()

    # Validate user token
    cursor.execute("""
            SELECT id FROM users
            WHERE token = ?
        """, (user_token,))
    
    user_row = cursor.fetchone()

    if not user_row:
        
        return jsonify({"error": "Invalid user token"}), 400
    
    user_id = user_row["id"]

    if request.method == "POST":
        data = request.get_json()
        game_state_json = json.dumps(data.get("game_state"))

        cursor.execute("""
                UPDATE daily_user_history
                SET game_state = ?
                WHERE user_id = ? AND date = ?
            """, (game_state_json, user_id, today))
        
        connect.commit()
        
        return jsonify({"message": "Game state updated successfully"}), 200
    
    else:
        cursor.execute("""
                SELECT game_state FROM daily_user_history
                WHERE user_id = ? AND date = ?
            """, (user_id, today))
        
        result = cursor.fetchone()
        

        if result and result["game_state"]:
            return jsonify(json.loads(result["game_state"]))
        
        return jsonify({"game_state": None})
    
@app.route("/api/get-active-transfer-code/<user_token>", methods=["GET"])
def get_active_transfer_code(user_token):
    """Get active transfer code if exists"""

    # today = get_server_datetime_now().isoformat()

    # Start db connection
    connect = get_db()
    cursor = connect.cursor()
    
    current_timestamp = get_current_timestamp()

    # Validate user token 
    cursor.execute("""
            SELECT id FROM users
            WHERE token = ?
        """, (user_token,))
    
    user_row = cursor.fetchone()

    if not user_row:
        
        return jsonify({"error": "Invalid user token"}), 400
    
    # Get active transfer code 
    cursor.execute("""
            SELECT code, expires_at FROM transfer_data
            WHERE user_token = ? AND used = 0 AND expires_at >= ?
        """, (user_token, current_timestamp))
    
    result = cursor.fetchone()
    

    if result:
        return jsonify({
            "transfer_code": result["code"],
            "expires_at": result["expires_at"],
        })
    
    return jsonify({
            "transfer_code": None,
            "expires_at": None,
        })
    

if __name__ == "__main__":
    app.run(debug=True)
