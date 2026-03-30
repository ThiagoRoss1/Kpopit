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
            WHERE date = %s AND won = TRUE AND gamemode_id = %s
        """, (today, g.gamemode_id))
    
    result = cursor.fetchone()
    
    user_count = result["user_count"] if result and result["user_count"] is not None else 0

    cursor.close()

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
            SELECT id FROM users WHERE token = %s
        """, (user_token,))
    
    user_row = cursor.fetchone()

    if not user_row:
        cursor.close()
        return jsonify({"error": "Invalid user token"}), 400
    
    user_id = user_row["id"]

    # Get user's first guess time, guesses count and win time
    cursor.execute("""
            SELECT started_at, guesses_count, won_at FROM daily_user_history
            WHERE user_id = %s AND date = %s AND won = TRUE AND gamemode_id = %s
        """, (user_id, today, g.gamemode_id))
    
    result = cursor.fetchone()

    if not result or result["started_at"] is None or result["guesses_count"] is None or result["won_at"] is None:
        cursor.close()
        return jsonify({"rank": None, "message": "User has not finished today's game"}), 200
    
    started_at = result["started_at"]
    guesses_count = result["guesses_count"]
    won_at = result["won_at"]

    # Calculate time to win
    if isinstance(started_at, str):
        started_at_dt = datetime.fromisoformat(started_at)
        won_at_dt = datetime.fromisoformat(won_at)
    else:
        started_at_dt = started_at
        won_at_dt = won_at

    # Fetch ranks and count user's rank
    cursor.execute("""
            SELECT COUNT(*) + 1 AS position FROM daily_user_history
            WHERE date = %s AND won = TRUE AND won_at < %s AND gamemode_id = %s
        """, (today, won_at, g.gamemode_id))
    
    position_result = cursor.fetchone()

    position = position_result["position"] if position_result else None

    # Fetch ranks and count user's rank
    cursor.execute("""
            SELECT COUNT(*) + 1 AS rank FROM daily_user_history d
            WHERE date = %s AND won = TRUE AND user_id != %s AND gamemode_id = %s
            AND (  
                d.guesses_count < %s
                OR (
                   d.guesses_count = %s 
                   AND (
                        (d.won_at - d.started_at) < (%s::timestamptz - %s::timestamptz)
                        OR (
                            (d.won_at - d.started_at) = (%s::timestamptz - %s::timestamptz)
                            AND (d.won_at < %s)
                        )
                    )
                )
            )
        """, 
            (
            today, user_id, g.gamemode_id, guesses_count, guesses_count, 
            won_at, started_at, won_at, started_at, won_at
            )
        )
    
    # past calc using sqlite (julianday(won_at) - julianday(started_at)) * 24 * 60 * 60 <= %s)
    
    rank_result = cursor.fetchone()
    rank = rank_result["rank"] if rank_result else None

    # Get user's score
    cursor.execute("""
            SELECT score FROM daily_user_history
            WHERE user_id = %s AND date = %s AND won = TRUE AND gamemode_id = %s
        """, (user_id, today, g.gamemode_id))
    
    result = cursor.fetchone()
    user_score = result["score"] if result and result["score"] is not None else 0

    cursor.close()

    return jsonify({"position": position, "rank": rank, "score": user_score})