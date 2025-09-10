import sqlite3
from flask import Flask, jsonify, request, redirect, session
from flask_babel import Babel
from flask_session import Session

app = Flask(__name__)

class Config:
    # Configure session
    LANGUAGES = ['en'] # Just english for now
    BABEL_DEFAULT_LOCALE = 'en'

app.config.from_object(Config)
babel = Babel(app)
Session(app)

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


