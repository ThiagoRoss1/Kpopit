from flask import Blueprint, jsonify
from services.gamemode_service import GameModeService
from services.get_db import get_db
from utils.dates import get_reset_countdown

general_bp = Blueprint('general', __name__)

# Get total number of game modes
@general_bp.route("/gamemodes-count", methods=["GET"])
def get_game_modes_count():
    """Return the total count of game modes available"""
    connect = get_db()
    cursor = connect.cursor()
    try:
        return jsonify({"gamemodes_count": GameModeService(connect).count_gamemodes(cursor)})
    finally:
        cursor.close()

# Get reset timer for next idol
@general_bp.route("/reset-timer")
def get_reset_timer():
    """Return the time remaining until the next daily idol reset"""
    return jsonify(get_reset_countdown())
