import sqlite3
import datetime
import random
from flask import Flask, jsonify, request, redirect, session
from flask_babel import Babel
from flask_session import Session

app = Flask(__name__)

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
            i.image_path,
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
        WHERE i.id = ?
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

    today_date = datetime.date.today().isoformat()

    # Query to select today's idol
    sql_query = """
        SELECT idol_id FROM daily_picks WHERE pick_date = ?        
    """
    cursor.execute(sql_query, (today_date,))
    todays_pick = cursor.fetchone()

    if todays_pick:
        return todays_pick['idol_id']
    
    # Check if the date is valid
    time_delta = datetime.timedelta(days=20)
    date_limit = (datetime.date.today() - time_delta).isoformat()
    
    # If no pick for today, select a random idol
    sql_query = """
        SELECT id FROM idols
        WHERE id NOT IN (
        SELECT idol_id FROM daily_picks WHERE pick_date >= ?)
    """
    cursor.execute(sql_query, (date_limit,))

    # Fetch all available idols
    available_idols = cursor.fetchall()

    """Error prevention: If there are no available idols (i.e., all idols have been picked in the last 20 days)"""
    # If no available idols, pick any random idol
    if not available_idols:
        cursor.execute("SELECT id FROM idols")
        available_idols = cursor.fetchall()

    # Transform 'Row object' list to a simple list of ids
    available_idols_ids = [row['id'] for row in available_idols]

    # Randomly select one idol from the available idols
    selected_idol_id = random.choice(available_idols_ids)

    # Insert the selected idol into daily_picks
    insert_sql = """
        INSERT INTO daily_picks (pick_date, idol_id) VALUES (?, ?)
    """
    cursor.execute(insert_sql, (today_date, selected_idol_id))

    # Return selected idol id
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

    connect.close()

    # Filter data 
    game_data = {
        "answer_id": idol_data_dict["idol_id"],
        
        # Get idol infos (safe to browser)
        "categories": [
            "Artist Name", "Gender", "Group", "Companies", "Nationality", 
            "Debut Year", "Birth Year", "Height", "Position",
        ]
        ## "reveal_info" -- TODO later // TODO - nationalities can be + than 1
    }

    return jsonify(game_data)


# Create idol guess route
@app.route("/api/game/guess", methods=["POST"])
def guess_idol():
    """Get idol guess and return comparison data as JSON"""

    data = request.get_json()
    guessed_idol_id = data.get("guessed_idol_id")
    answer_id = data.get("answer_id")

    if not guessed_idol_id or not answer_id:
        return jsonify({"error": "Missing guessed_idol_id or answer_id"}), 400
    
    # Start db connection
    connect = sqlite3.connect("kpopdle.db")
    connect.row_factory = sqlite3.Row
    cursor = connect.cursor()

    # Fetch full data for guessed idol and answer idol
    guessed_idol = dict(fetch_full_idol_data(cursor, guessed_idol_id))
    answer_data = dict(fetch_full_idol_data(cursor, answer_id))
    
    # Fetch careers and companies
    guessed_idol["career"] = fetch_full_idol_career(cursor, guessed_idol_id)
    answer_data["career"] = fetch_full_idol_career(cursor, answer_id)

    guessed_idol["companies"] = fetch_idol_companies(cursor, guessed_idol_id)
    answer_data["companies"] = fetch_idol_companies(cursor, answer_id)

    if not guessed_idol or not answer_data:
        connect.close()
        return jsonify({"error": "Idol not found"}), 404
    
    connect.close()
    
    # Compare data
    feedback = {}

    position_guess = set(position.strip() for position in guessed_idol["position"].split(", "))
    position_answer = set(position.strip() for position in answer_data["position"].split(", "))

    def partial_feedback(guess, answer):
        if guess == answer:
            return 'correct'
        elif not guess.isdisjoint(answer):
            return 'partial'
        else:
            return 'incorrect'
        
    position_feedback = {}
    
    position_feedback = partial_feedback(position_guess, position_answer)
    feedback['position'] = position_feedback

    # Numerical feedback
    numerical_feedback = {}
    for field in ["debut_year", "height", "birth_year"]:
        guess_val = guessed_idol.get(field)
        answer_val = answer_data.get(field)

        if guess_val > answer_val:
            numerical_feedback[field] = "higher"

        elif guess_val < answer_val:
            numerical_feedback[field] = "lower"

        else:
            numerical_feedback[field] = "correct"

    feedback.update(numerical_feedback)

    group_feedback = {}


    # TODO - number functions
    # TODO - groups / companies = use partial function
    # TODO - unique values (name, gender)


    # TODO - response / reveal dict taking feedback comparisons

    # TODO - jsonify final response dict

        




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

    



@app.route("/api/idols/<int:idol_id>")
def get_idol_data(idol_id):
    """Return idol data as JSON"""

    # Start db connection
    connect = sqlite3.connect("kpopdle.db")
    # Set row factory to act like a dictionary
    connect.row_factory = sqlite3.Row
    # Create a cursor
    cursor = connect.cursor()

    ## cursor.execute(....)

    # connect.close()

    # if ....
        # return jsonify(....)

    # ..... = dict(....)

    # return jsonify(....)


