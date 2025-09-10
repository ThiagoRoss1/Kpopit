import sqlite3
from flask import Flask, render_template, request, redirect, session
from flask_babel import Babel
from flask_session import Session

# Start db connection
connect = sqlite3.connect("kpopdle.db")
# Set row factory to act like a dictionary
connect.row_factory = sqlite3.Row
# Create a cursor
cursor = connect.cursor()

app = Flask(__name__)

class Config:
    # Configure session
    LANGUAGES = ['en'] # Just english for now
    BABEL_DEFAULT_LOCALE = 'en'

app.config.from_object(Config)
babel = Babel(app)
Session(app)

@app.route("/", methods=["GET", "POST"])
def index():
    return render_template("index.html")
 
