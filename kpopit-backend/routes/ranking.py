from flask import Blueprint, jsonify, g
from services.get_db import get_db
from utils.dates import get_today_date_str
from datetime import datetime

ranking_bp = Blueprint('ranking', __name__)

@ranking_bp.route("/daily-users-count", methods=["GET"])
def get_daily_users_count():
    """Return the count of users who played today's game"""

    today = get_today_date_str()
    # today = get_server_date()

    connect = get_db()
    cursor = connect.cursor()

    cursor.execute("""
            SELECT COUNT(DISTINCT user_id) AS user_count
            FROM daily_user_history
            WHERE date = ? AND won = 1 AND gamemode_id = ?
        """, (today, g.gamemode_id))
    
    result = cursor.fetchone()
    
    
    user_count = result["user_count"] if result and result["user_count"] is not None else 0

    return jsonify({"user_count": user_count})

@ranking_bp.route("/daily-rank/<user_token>", methods=["GET"])
def get_daily_rank(user_token):
    """Return the user's rank for today's game"""

    today = get_today_date_str()
    # today = get_server_date()

    connect = get_db()
    cursor = connect.cursor()

    # Validate user token
    cursor.execute("""
            SELECT id FROM users WHERE token = ?
        """, (user_token,))
    
    user_row = cursor.fetchone()

    if not user_row:
        
        return jsonify({"error": "Invalid user token"}), 400
    
    user_id = user_row["id"]

    # Get user's first guess time, guesses count and win time
    cursor.execute("""
            SELECT started_at, guesses_count, won_at FROM daily_user_history
            WHERE user_id = ? AND date = ? AND won = 1 AND gamemode_id = ?
        """, (user_id, today, g.gamemode_id))
    
    result = cursor.fetchone()

    if not result or result["started_at"] is None or result["guesses_count"] is None or result["won_at"] is None:
        
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
            WHERE date = ? AND won = 1 AND won_at < ? AND gamemode_id = ?
        """, (today, won_at, g.gamemode_id))
    
    position_result = cursor.fetchone()

    position = position_result["position"] if position_result else None

    # Fetch ranks and count user's rank
    cursor.execute("""
            SELECT COUNT(*) + 1 AS rank FROM daily_user_history
            WHERE date = ? AND won = 1 AND user_id != ?
            AND (guesses_count < ? 
            OR (guesses_count = ? AND (julianday(won_at) - julianday(started_at)) * 24 * 60 * 60 <= ?))
            AND gamemode_id = ?
        """, (today, user_id, guesses_count, guesses_count, time_to_win_seconds, g.gamemode_id))
    
    rank_result = cursor.fetchone()
    rank = rank_result["rank"] if rank_result else None

    # Get user's score
    cursor.execute("""
            SELECT score FROM daily_user_history
            WHERE user_id = ? AND date = ? AND won = 1 AND gamemode_id = ?
        """, (user_id, today, g.gamemode_id))
    
    result = cursor.fetchone()
    user_score = result["score"] if result and result["score"] is not None else 0
    
    

    return jsonify({"position": position, "rank": rank, "score": user_score})