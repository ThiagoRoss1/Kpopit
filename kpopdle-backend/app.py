import sqlite3
from datetime import datetime, timezone, timedelta, date
from zoneinfo import ZoneInfo
import random
from flask import Flask, jsonify, request, redirect, session
from flask_cors import CORS
import uuid
import math
import secrets
import json
from routes.admin import admin_bp
# from flask_babel import Babel
# from flask_session import Session

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins for static files

# Admin blueprint - Register routes
app.register_blueprint(admin_bp)

TIMEZONE_BRT = ZoneInfo('America/Sao_Paulo')
TIMEZONE_EST = ZoneInfo("America/New_York")
# return datetime.now(timezone.utc) -- EU
# return datetime.now(timezone.utc).date().isoformat() -- EU

TEST_MODE = False
TEST_DATE_OFFSET = 216 # Days to add/subtract (1 = tomorrow, -1 = yesterday)

def get_today_now():
    if TEST_MODE:
        return datetime.now(TIMEZONE_EST) + timedelta(days=TEST_DATE_OFFSET)
    
    return datetime.now(TIMEZONE_EST)

def get_today_date():
    return get_today_now().date()

def get_today_date_str() -> str:
    return get_today_now().date().isoformat()

def get_current_timestamp():
    return get_today_now().isoformat()

# TEST_MODE = False
# TEST_DATE_OFFSET = 1  # Dias para adicionar/subtrair (1 = amanhã, -1 = ontem)
# # ===============================================

# def get_server_date():
#     """Retorna a data do servidor (real ou de teste)"""
#     base_date = datetime.date.today()
#     if TEST_MODE:
#         return (base_date + datetime.timedelta(days=TEST_DATE_OFFSET)).isoformat()
#     return base_date.isoformat()

# def get_server_date_obj():
#     """Retorna a data do servidor (real ou de teste) como DATE OBJECT"""
#     base_date = datetime.date.today()
#     if TEST_MODE:
#         return base_date + datetime.timedelta(days=TEST_DATE_OFFSET)
#     return base_date

# def get_server_datetime_now():
#     base_date = datetime.datetime.now()
#     if TEST_MODE:
#         return base_date + datetime.timedelta(days=TEST_DATE_OFFSET)
#     return base_date


# server_date = get_server_date()

# class Config:
#     # Configure session
#     LANGUAGES = ['en'] # Just english for now
#     BABEL_DEFAULT_LOCALE = 'en'

# app.config.from_object(Config)
# babel = Babel(app)
# Session(app)

def fetch_full_idol_data(cursor, idol_id):
    """Fetch full idol data from the database"""  
    sql_query = """
        SELECT
            i.id AS idol_id,
            i.artist_name,
            i.real_name,
            i.gender,
            i.debut_year AS idol_debut_year,
            i.nationality,
            i.birth_year,
            i.position,
            i.height,
            i.image_path,
            i.is_published,
            g.id AS group_id,
            g.name AS group_name,
            g.group_debut_year,
            g.member_count,
            g.generation,
            g.fandom_name
        FROM idols AS i
        -- Join with idol career to get current group
        LEFT JOIN idol_career AS ic ON i.id = ic.idol_id AND ic.is_active = 1
        -- Join with groups table to get actual group data
        LEFT JOIN groups AS g ON ic.group_id = g.id
        WHERE i.id = ? AND i.is_published = 1
    """
    cursor.execute(sql_query, (idol_id,))
    return cursor.fetchone()

def fetch_full_idol_career(cursor, idol_id):
    """Fetch full idol career data from the database"""
    sql_query = """
        SELECT
            ic.is_active,
            ic.start_year,
            ic.end_year,
            g.name AS group_name
        FROM idol_career AS ic
        JOIN groups AS g ON ic.group_id = g.id
        WHERE ic.idol_id = ?
        ORDER BY ic.start_year ASC
    """
    cursor.execute(sql_query, (idol_id,))
    results = cursor.fetchall()
    # Convert Row objects to dictionaries
    return [dict(row) for row in results]


def fetch_group_companies(cursor, group_id):
    """Fetch group's companies from the database"""
    sql_query = """
        SELECT
            c.name,
            c.parent_company_id
        FROM companies AS c
        JOIN group_company_affiliation AS gca ON c.id = gca.company_id
        WHERE gca.group_id = ?
    """
    cursor.execute(sql_query, (group_id,))
    results = cursor.fetchall()
    # Convert Row objects to dictionaries
    return [dict(row) for row in results]


def fetch_idol_companies(cursor, idol_id):
    """Fetch idol's companies from the database"""
    sql_query = """
        SELECT
            c.name,
            c.parent_company_id
        FROM companies AS c
        JOIN idol_company_affiliation AS ica ON c.id = ica.company_id
        WHERE ica.idol_id = ?
    """
    cursor.execute(sql_query, (idol_id,))
    results = cursor.fetchall()
    # Convert Row objects to dictionaries
    return [dict(row) for row in results]


def choose_idol_of_the_day(cursor):
    """Choose a random idol as the 'Idol of the Day'"""

    COOLDOWN_DAYS = 10
    BOOST_DAYS = 50
    MULTIPLIER = 2
    

    today_date = get_today_date_str()
    today_date_obj = get_today_date()

    # Query to select today's idol
    sql_query = """
        SELECT idol_id FROM daily_picks WHERE pick_date = ?        
    """
    cursor.execute(sql_query, (today_date,))
    todays_pick = cursor.fetchone()

    if todays_pick:
        return todays_pick['idol_id']
    
    # Check if the date is valid
    time_delta = timedelta(days=COOLDOWN_DAYS)
    date_limit = (today_date_obj - time_delta).isoformat()
    
    # If no pick for today, select a random idol - if is_published = 1
    sql_query = """
        SELECT id, last_picked_date FROM idols
        WHERE is_published = 1 AND id NOT IN (
        SELECT idol_id FROM daily_picks WHERE pick_date >= ?)
    """
    cursor.execute(sql_query, (date_limit,))

    # Fetch all available idols
    available_idols = cursor.fetchall()

    possible_idols = []
    weights = []

    """Error prevention: If there are no available idols (i.e., all idols have been picked in the last 20 days)"""
    # If no available idols, pick any random idol
    if available_idols:
        for idol in available_idols:
            idol_id = idol['id']
            last_picked_date = idol['last_picked_date'] or None

            try:
                last_date = date.fromisoformat(last_picked_date) if last_picked_date else None
                days_waiting = (today_date_obj - last_date).days if last_date else BOOST_DAYS

            except Exception as e:
                print(f"Error parsing date for idol ID {idol_id}: {e}")
                days_waiting = COOLDOWN_DAYS
            
            A = 1 
            K = 0.08
            weight = (A * math.exp(K * days_waiting))

            if not last_picked_date:
                weight *= MULTIPLIER

            possible_idols.append(idol_id)
            weights.append(weight)

        selected_idol_id = random.choices(possible_idols, weights=weights, k=1)[0]
    
    else:
        cursor.execute("SELECT id FROM idols WHERE is_published = 1")
        available_idols = cursor.fetchall()

        # Transform 'Row object' list to a simple list of ids
        available_idols_ids = [row['id'] for row in available_idols]

        if not available_idols_ids: 
            return None

        # Randomly select one idol from the available idols
        selected_idol_id = random.choice(available_idols_ids)

    cursor.execute("""
        INSERT INTO daily_picks (pick_date, idol_id) VALUES (?, ?)
    """, (today_date, selected_idol_id))
    
    cursor.execute("""
            UPDATE idols SET last_picked_date = ?
            WHERE id = ?
        """, (today_date, selected_idol_id))

    # Return the selected idol id
    return selected_idol_id


# Create daily idol route
@app.route("/api/game/daily-idol")
def get_daily_idol():
    """Return the 'Idol of the Day' data as JSON"""

    # Start db connection
    connect = sqlite3.connect("kpopdle.db")
    connect.row_factory = sqlite3.Row
    cursor = connect.cursor()

    # Choose idol of the day 
    idol_id = choose_idol_of_the_day(cursor)
    connect.commit()

    """ For testing purposes, you can set a fixed idol_id """
    # idol_id = 1

    # Fetch full idol data
    idol_data = fetch_full_idol_data(cursor, idol_id)

    if not idol_data:
        connect.close()
        return jsonify({"error": "Idol not found"}), 404
    
    idol_data_dict = dict(idol_data)

    # Fetch idol companies
    idol_companies = fetch_idol_companies(cursor, idol_id)
    idol_data_dict["companies"] = idol_companies

    # Fetch group companies
    group_id = idol_data_dict["group_id"]
    if group_id:
        group_companies = fetch_group_companies(cursor, group_id)
        idol_data_dict["group_companies"] = group_companies
    else:
        idol_data_dict["group_companies"] = []

    # Debug print
    print("\n -- ENTIRE IDOL DATA DICT --")
    print(idol_data_dict)
    print(" ------------------------\n")


    # Add career data 
    idol_career_for_groups = fetch_full_idol_career(cursor, idol_id)
    groups = [career["group_name"] for career in idol_career_for_groups if career.get("is_active")]

    # Streak reset
    user_token = request.headers.get("Authorization") or request.args.get("user_token")

    if user_token:
        cursor.execute("""
                SELECT id FROM users
                WHERE token = ?
            """, (user_token,))
        
        user_row = cursor.fetchone()

        if user_row:
            user_id = user_row["id"]
            today = get_today_date_str()
            # today = get_server_date()

            cursor.execute("""
                    SELECT last_played_date FROM user_history
                    WHERE user_id = ?
                """, (user_id,))
            
            last_played_row = cursor.fetchone()

            if last_played_row and last_played_row["last_played_date"]:
                last_played_obj = date.fromisoformat(last_played_row["last_played_date"])
                today_obj = date.fromisoformat(today)

                if (today_obj - last_played_obj).days > 1:
                    # Reset streak
                    cursor.execute("""
                            UPDATE user_history
                            SET current_streak = 0
                            WHERE user_id = ?
                        """, (user_id,))
                    connect.commit()

    connect.close()
    
    # Filter data 
    game_data = {
        "answer_id": idol_data_dict["idol_id"],
        
        # Get idol infos (safe to browser)
        "categories": [
            "Artist Name", "Gender", "Group", "Companies", "Nationality", 
            "Debut Year", "Birth Year", "Height", "Position",
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

    if not guessed_idol_id or not answer_id:
        return jsonify({"error": "Missing guessed_idol_id or answer_id"}), 400
    
    if not user_token:
        return jsonify({"error": "Missing user token"}), 400

    # Start db connection
    connect = sqlite3.connect("kpopdle.db")
    connect.row_factory = sqlite3.Row
    cursor = connect.cursor()

    # Validate user token
    cursor.execute("""SELECT id FROM users WHERE token = ?""", (user_token,))
    user_row = cursor.fetchone()

    if not user_row:
        connect.close()
        return jsonify({"error": "Invalid user token"}), 400
    
    user_id = user_row["id"]

    # Fetch full data for guessed idol and answer idol
    guessed_idol = dict(fetch_full_idol_data(cursor, guessed_idol_id))
    answer_data = dict(fetch_full_idol_data(cursor, answer_id))
    
    # Fetch careers and companies
    guessed_idol["career"] = fetch_full_idol_career(cursor, guessed_idol_id)
    answer_data["career"] = fetch_full_idol_career(cursor, answer_id)

    guessed_idol["companies"] = fetch_idol_companies(cursor, guessed_idol_id)
    answer_data["companies"] = fetch_idol_companies(cursor, answer_id)

    # Special case - if idol has a group, fetch group companies too
    guessed_group_id = guessed_idol.get("group_id")
    if guessed_group_id:
        guessed_idol["group_companies"] = fetch_group_companies(cursor, group_id=guessed_group_id)
    else:
        guessed_idol["group_companies"] = []

    answer_group_id = answer_data.get("group_id")
    if answer_group_id:
        answer_data["group_companies"] = fetch_group_companies(cursor, group_id=answer_group_id)
    else:
        answer_data["group_companies"] = []

    for field in ["nationality", "position"]:
        for idol in [guessed_idol, answer_data]:
            if field in idol and isinstance(idol[field], str):
                idol[field] = [item.strip() for item in idol[field].split(",")]
            elif field not in idol or idol[field] is None:
                idol[field] = []


    # guessed_idol["group_companies"] = fetch_group_companies(cursor, group_id=guessed_idol["group_id"] if guessed_idol["group_id"] else None)
    # answer_data["group_companies"] = fetch_group_companies(cursor, group_id=answer_data["group_id"] if answer_data["group_id"] else None)

    if not guessed_idol or not answer_data:
        connect.close()
        return jsonify({"error": "Idol not found"}), 404
    
    # connect.close() -- MOVED DOWN --
    
    # Compare data
    feedback = {}

    # Partial feedback function
    def partial_feedback_function(guess, answer):
        if guess == answer:
            return {
                "status": "correct",
                "correct_items": list(guess),
                "incorrect_items": []
            }
        
        partial = guess.intersection(answer) # == guess & answer 

        if partial:
            return {
                "status": "partial",
                "correct_items": list(partial),
                "incorrect_items": list(guess.difference(answer)) # == guess - answer
            }
        
        else:
            return {
                "status": "incorrect",
                "correct_items": [],
                "incorrect_items": list(guess)
            }
        

    # Position
    position_guess = set(position.strip() for position in (guessed_idol.get("position", [])))
    position_answer = set(position.strip() for position in (answer_data.get("position", [])))

    feedback['position'] = partial_feedback_function(position_guess, position_answer)

    # Nationality
    idol_nationality_guess = set(nationality.strip() for nationality in (guessed_idol.get("nationality", [])))
    idol_nationality_answer = set(nationality.strip() for nationality in (answer_data.get("nationality", [])))

    feedback["nationality"] = partial_feedback_function(idol_nationality_guess, idol_nationality_answer)

    # Numerical feedback function
    def numerical_feedback_function(guessed_idol, answer_data, fields):
        numerical_feedback = {}

        for field in fields:
            guess_val = guessed_idol.get(field)
            answer_val = answer_data.get(field)

            if guess_val is None or answer_val is None:
                numerical_feedback[field] = {
                    "status": "incorrect",
                    "correct_items": [],
                    "incorrect_items": []
                }
                continue

            if guess_val > answer_val:
                numerical_feedback[field] = {
                    "status": "higher",
                    "correct_items": [],
                    "incorrect_items": [guess_val]
                }

            elif guess_val < answer_val:
                numerical_feedback[field] = {
                    "status": "lower",
                    "correct_items": [],
                    "incorrect_items": [guess_val]
                }

            else:
                numerical_feedback[field] = {
                    "status": "correct",
                    "correct_items": [guess_val],
                    "incorrect_items": []
                }

        return numerical_feedback
    
    # Numbers - debut year, height, birth year, member count, generation...
    numerical_fields = ["idol_debut_year", "height", "birth_year", "member_count", "generation"]
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


    # TODO - number functions - DONE
    # TODO - groups / companies = use partial function - DONE 
    # TODO - unique values (name, gender) - DONE 


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
    is_correct = guessed_idol.get("idol_id") == answer_data.get("idol_id")
    one_shot_win = is_correct and current_attempt == 1
    today = get_today_date_str()
    current_timestamp = get_current_timestamp()
    # today = get_server_date()

    # Calculate streak function
    def streak_calculation(cursor, user_id):
            cursor.execute("""
                    SELECT date, won FROM daily_user_history
                    WHERE user_id = ? AND won = 1
                    ORDER BY date DESC
                """, (user_id,))
            
            results = cursor.fetchall()

            if not results:
                return 0
            
            streak = 0
            expected_date = get_today_date()
            # expected_date = get_server_date_obj()
            
            for row in results:
                game_date = date.fromisoformat(row["date"])

                if game_date == expected_date:
                    streak += 1
                    expected_date -= timedelta(days=1)
                else:
                    break

            return streak
   
    # Update user history in the database 
    try:
        cursor.execute("BEGIN TRANSACTION")

        cursor.execute(
            """
                INSERT INTO daily_user_history (user_id, date, guesses_count, won, one_shot_win, won_at, started_at)
                VALUES (?, ?, ?, ?, ?, CASE WHEN ? = 1 THEN ? ELSE NULL END, CASE WHEN ? = 1 THEN ? ELSE NULL END)
                ON CONFLICT(user_id, date) DO UPDATE SET   
                guesses_count = excluded.guesses_count,
                won = excluded.won OR won,
                one_shot_win = excluded.one_shot_win OR one_shot_win,
                
                won_at = CASE WHEN excluded.won = 1 AND daily_user_history.won_at IS NULL
                THEN excluded.won_at ELSE daily_user_history.won_at END,

                started_at = CASE WHEN excluded.guesses_count = 1 AND daily_user_history.started_at IS NULL
                THEN excluded.started_at ELSE daily_user_history.started_at END
            """, (user_id, today, current_attempt, is_correct, 
                  one_shot_win, is_correct, current_timestamp, 
                  current_attempt, current_timestamp))
                        
        if is_correct:
            S0 = 10
            decay_rate = 0.1
            n = current_attempt

            score = S0 * round(math.exp(-decay_rate * (n - 1)), 3)

            cursor.execute("""
                    UPDATE daily_user_history
                    SET score = ?
                    WHERE user_id = ? AND date = ?
                """, (score, user_id, today))

            cursor.execute("""
                SELECT AVG(guesses_count) as avg_guesses
                FROM daily_user_history
                WHERE user_id = ? AND won = TRUE
            """, (user_id,))

            streak = streak_calculation(cursor, user_id)


            cursor.execute("""
                INSERT INTO user_history 
                (user_id, current_streak, max_streak, wins_count, average_guesses, one_shot_wins, last_played_date)
                VALUES (?, ?, ?, 1, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                        current_streak = ?,
                        max_streak = MAX(max_streak, ?),
                        wins_count = wins_count + 1,
                        average_guesses = ROUND((average_guesses * (wins_count) + ? ) / (wins_count + 1), 2),
                        one_shot_wins = one_shot_wins + ?,
                        last_played_date = ?
                """, (
                    user_id, 
                    streak, 
                    streak, 
                    current_attempt, 
                    1 if one_shot_win else 0,
                    today,           
                    # Update values:
                    streak,
                    streak,
                    current_attempt,
                    1 if one_shot_win else 0,
                    today
                )
            )

        # TODO: not commiting into user_history
        cursor.execute("COMMIT")
    
    except Exception as e:
        cursor.execute("ROLLBACK")
        print(f"Error updating user history: {e}")

    finally:
        connect.close()

    # TODO - response / reveal dict taking feedback comparisons - DONE

    keys_for_display = [
        "idol_id", "artist_name", "gender", "nationality", "idol_debut_year", 
        "birth_year", "height", "position", "image_path", "member_count" # just this for now
    ]

    data_for_display = {key: guessed_idol.get(key) for key in keys_for_display}

    """Extra datas"""

    # Groups data
    data_for_display["groups"] = [group["group_name"] for group in guessed_idol["career"]]

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

    # TODO - jsonify final response dict - DONE

    return jsonify(response_data)

# Create idol list (For frontend check, list, dropdown...)
@app.route("/api/idols-list")
def get_idols_list():
    """Return a list of all idols with their id and names as JSON"""
    
    # Start db connection
    connect = sqlite3.connect("kpopdle.db")
    connect.row_factory = sqlite3.Row
    cursor = connect.cursor()

    # Fetch all idols
    idol_query = """
        SELECT id, artist_name, image_path FROM idols WHERE is_published = 1 ORDER BY artist_name ASC
    """
    cursor.execute(idol_query)
    results = cursor.fetchall()

    idols_list = [dict(row) for row in results]

    groups_query = """
        SELECT ic.idol_id, g.name AS group_name
        FROM idol_career AS ic
        JOIN groups AS g ON ic.group_id = g.id
        WHERE ic.is_active = 1
    """
    cursor.execute(groups_query)
    results = cursor.fetchall()

    idol_groups = {}

    for row in results:
        for row in results:
            idol_groups.setdefault(row["idol_id"], []).append(row["group_name"])

    for idol in idols_list:
        idol_id = idol["id"]
        idol["groups"] = idol_groups.get(idol_id, [])

    connect.close()

    return jsonify(idols_list)

# Store yesterdays idol pick
@app.route("/api/store-yesterdays-idol")
def store_yesterdays_idol():
    """Store yesterday's idol pick in the database"""
    
    # Start db connection
    connect = sqlite3.connect("kpopdle.db")
    connect.row_factory = sqlite3.Row
    cursor = connect.cursor()

    # Gey yesterday's date

    yesterday = get_today_date() - timedelta(days=1)
    yesterday_str = yesterday.isoformat()

    # Store yesterday's idol pick
    sql_query = """
        CREATE TABLE IF NOT EXISTS yesterday_picks_test (
        past_idol_id INTEGER NOT NULL,
        yesterdays_pick_date DATE PRIMARY KEY,

        /* --- Foreign Key --- */
        FOREIGN KEY(past_idol_id) REFERENCES idols(id)
        );
    """  
    cursor.execute(sql_query)

    # Get idol id for yesterday
    select_sql = """
        SELECT idol_id FROM daily_picks WHERE pick_date = ?
    """
    cursor.execute(select_sql, (yesterday_str,))
    result = cursor.fetchone()


    if result:
        # Insert or Update yesterday's pick
        insert_sql = """
            INSERT INTO yesterday_picks_test (past_idol_id, yesterdays_pick_date)
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

        connect.close()

        return jsonify({
            "past_idol_id": result["idol_id"], 
            "yesterdays_pick_date": yesterday_str,
            "artist_name": artist_name,
            "groups": [group_result["name"]] if group_result else [],
            "image_path": image_path
        })

    else:
        connect.close()
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
            connect = sqlite3.connect("kpopdle.db")
            connect.row_factory = sqlite3.Row
            cursor = connect.cursor()
            
            token_insert_sql = """
                INSERT INTO users (token, created_at) VALUES (?, ?)
            """
            cursor.execute(token_insert_sql, (token, current_timestamp))
            connect.commit()
            connect.close()
            token_sucessfuly_generated = True
    
        except sqlite3.IntegrityError as e:
            attempts += 1
            print(f"Token generation attempt {attempts} failed: {e}")
            error += str(e)

        except Exception as e:
            attempts += 1
            print(f"Token generation attempt {attempts} failed: {e}")
            error += str(e)

        finally:
            if connect:
                connect.close()
        

    if token_sucessfuly_generated:
        return jsonify({"token": token})
    else:
        return jsonify({"error": "Failed to generate unique token after 5 attempts", "details": error}), 500
    
@app.route("/api/stats/<user_token>", methods=["GET"])
def get_user_stats(user_token):
    """Return user stats based on the provided token"""

    # Start db connection
    connect = sqlite3.connect("kpopdle.db")
    connect.row_factory = sqlite3.Row
    cursor = connect.cursor()

    # Validate user token 
    cursor.execute("""
            SELECT id FROM users WHERE token = ?
        """, (user_token,))
    
    user_row = cursor.fetchone()

    if not user_row:
        connect.close()
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
    connect.close()

    return jsonify(user_stats)

@app.route("/api/daily-users-count", methods=["GET"])
def get_daily_users_count():
    """Return the count of users who played today's game"""

    today = get_today_date_str()
    # today = get_server_date()

    connect = sqlite3.connect("kpopdle.db")
    connect.row_factory = sqlite3.Row
    cursor = connect.cursor()

    cursor.execute("""
            SELECT COUNT(DISTINCT user_id) AS user_count
            FROM daily_user_history
            WHERE date = ? AND won = 1
        """, (today,))
    
    result = cursor.fetchone()
    connect.close()
    
    user_count = result["user_count"] if result and result["user_count"] is not None else 0

    return jsonify({"user_count": user_count})

@app.route("/api/daily-rank/<user_token>", methods=["GET"])
def get_daily_rank(user_token):
    """Return the user's rank for today's game"""
    today = get_today_date_str()
    # today = get_server_date()

    connect = sqlite3.connect("kpopdle.db")
    connect.row_factory = sqlite3.Row
    cursor = connect.cursor()

    # Validate user token
    cursor.execute("""
            SELECT id FROM users WHERE token = ?
        """, (user_token,))
    
    user_row = cursor.fetchone()

    if not user_row:
        connect.close()
        return jsonify({"error": "Invalid user token"}), 400
    
    user_id = user_row["id"]

    # Get user's first guess time, guesses count and win time
    cursor.execute("""
            SELECT started_at, guesses_count, won_at FROM daily_user_history
            WHERE user_id = ? AND date = ? AND won = 1
        """, (user_id, today))
    
    result = cursor.fetchone()

    if not result or result["started_at"] is None or result["guesses_count"] is None or result["won_at"] is None:
        connect.close()
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
    
    connect.close()

    return jsonify({"position": position, "rank": rank, "score": user_score})

@app.route("/api/generate-transfer-code/<user_token>", methods=["POST"])
def generate_transfer_code(user_token):
    """Generate a transfer code for the user to transfer their data to another device"""
    code_generated = False
    # Start db connection
    connect = sqlite3.connect("kpopdle.db")
    connect.row_factory = sqlite3.Row
    cursor = connect.cursor()

    current_timestamp = get_current_timestamp()

    # Validate user token
    cursor.execute("""
            SELECT id FROM users WHERE token = ?
        """, (user_token,))
    
    user_row = cursor.fetchone()

    if not user_row:
        connect.close()
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
                connect.close()
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

    connect.close()

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
    connect = sqlite3.connect("kpopdle.db")
    connect.row_factory = sqlite3.Row
    cursor = connect.cursor()

    # Validate transfer code
    cursor.execute("""
            SELECT code, user_token, expires_at, used FROM transfer_data
            WHERE code = ?
        """, (transfer_code,))
        
    code_row = cursor.fetchone()

    if not code_row:
        connect.close()
        return jsonify({"error": "Invalid transfer code"}), 400
    
    if code_row["used"]:
        connect.close()
        return jsonify({"error": "Transfer code has already been used"}), 400
    
    expires_at = datetime.fromisoformat(code_row["expires_at"])
    if expires_at < get_today_now():
    # if expires_at < get_server_datetime_now():
        connect.close()
        return jsonify({"error": "Transfer code has expired"}), 400
    
    user_token = code_row["user_token"]

    # Mark code as used
    cursor.execute("""
            UPDATE transfer_data
            SET used = 1
            WHERE code = ? AND used = 0
        """, (transfer_code,))
    connect.commit()
    connect.close()

    return jsonify({"user_token": user_token})

@app.route("/api/game-state/<user_token>", methods=["GET", "POST"])
def get_game_state(user_token):
    """Return the current game state for the user"""
    today = get_today_date_str()
    # today = get_server_date()

    # Start db connection
    connect = sqlite3.connect("kpopdle.db")
    connect.row_factory = sqlite3.Row
    cursor = connect.cursor()

    # Validate user token
    cursor.execute("""
            SELECT id FROM users
            WHERE token = ?
        """, (user_token,))
    
    user_row = cursor.fetchone()

    if not user_row:
        connect.close()
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
        connect.close()
        return jsonify({"message": "Game state updated successfully"}), 200
    
    else:
        cursor.execute("""
                SELECT game_state FROM daily_user_history
                WHERE user_id = ? AND date = ?
            """, (user_id, today))
        
        result = cursor.fetchone()
        connect.close()

        if result and result["game_state"]:
            return jsonify(json.loads(result["game_state"]))
        
        return jsonify({"game_state": None})
    
@app.route("/api/get-active-transfer-code/<user_token>", methods=["GET"])
def get_active_transfer_code(user_token):
    """Get active transfer code if exists"""

    # today = get_server_datetime_now().isoformat()

    # Start db connection
    connect = sqlite3.connect("kpopdle.db")
    connect.row_factory = sqlite3.Row
    cursor = connect.cursor()
    
    current_timestamp = get_current_timestamp()

    # Validate user token 
    cursor.execute("""
            SELECT id FROM users
            WHERE token = ?
        """, (user_token,))
    
    user_row = cursor.fetchone()

    if not user_row:
        connect.close()
        return jsonify({"error": "Invalid user token"}), 400
    
    # Get active transfer code 
    cursor.execute("""
            SELECT code, expires_at FROM transfer_data
            WHERE user_token = ? AND used = 0 AND expires_at >= ?
        """, (user_token, current_timestamp))
    
    result = cursor.fetchone()
    connect.close()

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



    # comparison = {
    #     "artist_name": guessed_idol["artist_name"] == answer_data["artist_name"],
    #     "gender": guessed_idol["gender"] == answer_data["gender"],
    #     "group": guessed_idol["group_id"] == answer_data["group_id"],
    #     "companies": any(
    #         company in [company["name"] for company in fetch_idol_companies(cursor, guessed_idol)]
    #         for company in [company["name"] for company in fetch_idol_companies(cursor, answer_data)]
    #     ),
    #     "nationality": guessed_idol["nationality"] == answer_data["nationality"],
    #     "debut_year": guessed_idol["debut_year"] == answer_data["debut_year"],
    #     "birth_year": guessed_idol["birth_year"] == answer_data["birth_year"],
    #     "height": guessed_idol["height"] == answer_data["height"],
    #     "position": any(
    #         position in guessed_idol["position"].split(", ")
    #         for position in answer_data["position"].split(", ")
    #     )
    # }

    # # Final answer (correct or not)
    # is_correct = guessed_idol["idol_id"] == answer_data["idol_id"]

    # # Final JSON response

    



# @app.route("/api/idols/<int:idol_id>")
# def get_idol_data(idol_id):
#     """Return idol data as JSON"""

#     # Start db connection
#     connect = sqlite3.connect("kpopdle.db")
#     # Set row factory to act like a dictionary
#     connect.row_factory = sqlite3.Row
#     # Create a cursor
#     cursor = connect.cursor()

#     ## cursor.execute(....)

#     # connect.close()

#     # if ....
#         # return jsonify(....)

#     # ..... = dict(....)

#     # return jsonify(....)

# @app.route("/api/daily-rank/<user_token>", methods=["GET"])
# def get_daily_rank(user_token):
#     """Return the user's position for today's game after winning - refreshable"""
#     today = datetime.date.today().isoformat()

#     connect = sqlite3.connect("kpopdle.db")
#     connect.row_factory = sqlite3.Row
#     cursor = connect.cursor()

#     # Validate user token 
#     cursor.execute("""
#             SELECT id FROM users WHERE token = ?
#         """, (user_token,))
    
#     user_row = cursor.fetchone()

#     if not user_row:
#         connect.close()
#         return jsonify({"error": "Invalid user token"}), 400
    
#     user_id = user_row["id"]

#     # Get user's first guess time, guesses count and win time
#     cursor.execute("""
#             SELECT started_at, guesses_count, won_at FROM daily_user_history
#             WHERE user_id = ? AND date = ? AND won = 1
#         """, (user_id, today))
    
#     result = cursor.fetchone()

#     if not result or result["started_at"] is None or result["guesses_count"] is None or result["won_at"] is None:
#         connect.close()
#         return jsonify({"rank": None, "message": "User has not finished today's game"}), 200
    
#     started_at = result["started_at"]
#     guesses_count = result["guesses_count"]
#     won_at = result["won_at"]

#     # Calculate time to win
#     time_to_win = datetime.datetime.fromisoformat(won_at) - datetime.datetime.fromisoformat(started_at) # With python - (Can use julianday in SQL too)
#     time_to_win_seconds = int(time_to_win.total_seconds())

#     # Fetch ranks and count user's rank
#     cursor.execute("""
#             SELECT COUNT(*) + 1 AS rank FROM daily_user_history
#             WHERE date = ? AND won = 1 
#             AND (guesses_count < ? 
#             OR (guesses_count = ? AND (julianday(won_at) - julianday(started_at)) * 24 * 60 * 60 < ?))
#         """, (today, guesses_count, guesses_count, time_to_win_seconds))
    
#     rank_result = cursor.fetchone()
#     connect.close()
    
#     rank = rank_result["rank"] if rank_result else None

#     return jsonify({"rank": rank})