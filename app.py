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
        SELECT * FROM idols
        LEFT JOIN idol_career ON idols.id = idol_career.idol_id
        LEFT JOIN groups ON idol_career.group_id = groups.id
        LEFT JOIN idol_company_affiliation AS ica ON idols.id = ica.idol_id
        LEFT JOIN companies AS c_idol ON ica.company_id = c_idol.id
        LEFT JOIN group_company_affiliation AS gca ON groups.id = gca.group_id
        LEFT JOIN companies AS c_group ON gca.company_id = c_group.id
        WHERE idols.id = ?
    """
    cursor.execute(sql_query, (idol_id,))
    return cursor.fetchone()
      


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


