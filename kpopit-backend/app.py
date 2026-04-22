import os
from flask import Flask, request, g, jsonify
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
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
from routes.idols_page.idols_page import idols_page_bp
from routes.auth import auth_bp
from utils.rate_limiter import limiter
from flask_limiter import RateLimitExceeded
load_dotenv()

# Global variables
DB_URL = os.getenv("DB_URL")
ADMIN_ENABLED = os.getenv("ADMIN_ENABLED", "false").lower() == "true"
FLASK_ENV = os.getenv("FLASK_ENV", "production").lower()
FRONTEND_URL = os.getenv("FRONTEND_URL")
MAINTENANCE_MODE = os.getenv("MAINTENANCE_MODE", "false").lower() == "true"
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY or len(JWT_SECRET_KEY) < 32:
    raise RuntimeError("JWT_SECRET_KEY not set in environment variables (min 32 chars).")

app = Flask(__name__)
app.json.sort_keys = False

# Trust one proxy hop (Railway/Render/Vercel) so request.remote_addr returns
# the real client IP. Required for Flask-Limiter to key buckets per user
# rather than per platform proxy.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

init_app(app)
limiter.init_app(app)

@app.errorhandler(RateLimitExceeded)
def handle_rate_limit_exceeded(e):
    response = jsonify({"error": "Too many requests. Please try again later."})
    response.status_code = 429
    # Preserve Retry-After from Flask-Limiter so clients can back off correctly.
    for name, value in e.get_headers():
        if name.lower() == "retry-after":
            response.headers[name] = value
    return response

if FLASK_ENV == "development":
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True, expose_headers=["Retry-After"])

else:
    urls_string = FRONTEND_URL if FRONTEND_URL else ""
    frontend_urls = urls_string.split(",")
    CORS(app, resources={r"/*": {"origins": frontend_urls}}, supports_credentials=True, expose_headers=["Retry-After"])

@app.before_request
def check_maintenance_mode():
    """Check if the application is in maintenance mode before processing any request"""
    if MAINTENANCE_MODE and request.path.startswith("/api"):
        if request.method == "OPTIONS":
            return
        return jsonify({"error": "The service is currently under maintenance. Please try again later."}), 503 

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

# Idols page blueprint - Register idols page route
app.register_blueprint(idols_page_bp, url_prefix="/api")

# Auth blueprint - Register, login, logout, refresh, me, claim routes
app.register_blueprint(auth_bp, url_prefix="/api")

# Repository loading hook (optional future enhancement):
# If needed, a before_request handler can be added here to attach
# a repository instance (for example, an IdolRepository) to flask.g
# for each request.

if __name__ == "__main__":
    app.run(debug=True)
