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
from routes.games.classic import classic_bp
from routes.users import user_bp
from routes.idols import idol_bp
from routes.game_logic import game_logic_bp
from routes.general import general_bp
from routes.ranking import ranking_bp
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

@app.before_request
def load_gamemode():
    """Load gamemode from request args before each request"""
    g.gamemode_id = request.args.get("gamemode_id", default=1, type=int)
    
# Admin blueprint - Register routes
if ADMIN_ENABLED:
    app.register_blueprint(admin_bp)

# Tasks blueprint - Backup route
app.register_blueprint(tasks_bp, url_prefix="/api")

# Idols List blueprint - Entire idols list
app.register_blueprint(idol_bp, url_prefix="/api")

# Blurry game blueprint - Register routes
app.register_blueprint(blurry_bp, url_prefix="/api")

# Classic game blueprint - Register routes
app.register_blueprint(classic_bp, url_prefix="/api")

# Users blueprint - User token generation and stats routes
app.register_blueprint(user_bp, url_prefix="/api")

# Game logic blueprint - Register yesterday's idol pick route
app.register_blueprint(game_logic_bp, url_prefix="/api")

# General routes blueprint - Reset timer route
app.register_blueprint(general_bp, url_prefix="/api")

# Ranking routes blueprint - Daily users count and rank routes
app.register_blueprint(ranking_bp, url_prefix="/api")

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

if __name__ == "__main__":
    app.run(debug=True)
