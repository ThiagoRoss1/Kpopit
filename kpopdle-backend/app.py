import sqlite3
import datetime
import random
from flask import Flask, jsonify, request, redirect, session
from flask_cors import CORS
# from flask_babel import Babel
# from flask_session import Session

app = Flask(__name__)
CORS(app)

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
    
    connect.close()
    
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
    sql_query = """
        SELECT id, artist_name FROM idols ORDER BY artist_name ASC
    """
    cursor.execute(sql_query)
    results = cursor.fetchall()

    idols_list = [dict(row) for row in results]

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

    yesterday = datetime.date.today() - datetime.timedelta(days=1)
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
    
        # --- Extra query only for test purposes: fetch idol name ---
        test_sql = """
            SELECT artist_name FROM idols WHERE id = ?
        """
        cursor.execute(test_sql, (result["idol_id"],))
        artist_name = cursor.fetchone()["artist_name"]

        connect.close()

        return jsonify({
            "past_idol_id": result["idol_id"], 
            "yesterdays_pick_date": yesterday_str,
            "artist_name": artist_name
        })

    else:
        connect.close()
        return jsonify({"message": "First day - no yesterday pick to store"})


# Get reset timer for next idol
@app.route("/api/reset-timer")
def get_reset_timer():
    """Return the time remaining until the next daily idol reset"""
    
    time = datetime.datetime.now()
    
    next_reset = time.replace(hour=0, minute=0, second=0, microsecond=0) + datetime.timedelta(days=1)
    
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


