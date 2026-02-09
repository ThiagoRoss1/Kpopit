import os
from flask import Flask, request, g
from flask_cors import CORS
from routes.admin import admin_bp
from routes.tasks import tasks_bp
from dotenv import load_dotenv
from services.get_db import init_app
from routes.games.blurry import blurry_bp
from routes.games.classic import classic_bp
from routes.users import user_bp
from routes.idols import idol_bp
from routes.game_logic import game_logic_bp
from routes.general import general_bp
from routes.ranking import ranking_bp
from routes.session_info import session_info
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

# Session Info blueprint - Analytics data route
app.register_blueprint(session_info, url_prefix="/api")

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

# Repository loading hook (optional future enhancement):
# If needed, a before_request handler can be added here to attach
# a repository instance (for example, an IdolRepository) to flask.g
# for each request.

if __name__ == "__main__":
    app.run(debug=True)
