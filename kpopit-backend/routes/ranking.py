from flask import Blueprint, jsonify, g, request
from utils.auth_helpers import user_token_from_header
from services.get_db import get_db
from services.ranking_service import RankingService

ranking_bp = Blueprint('ranking', __name__)

@ranking_bp.route("/daily-users-count", methods=["GET"])
def get_daily_users_count():
    """Return the count of users who played today's game"""
    connect = get_db()
    cursor = connect.cursor()
    try:
        return jsonify({"user_count": RankingService(connect).get_daily_users_count(cursor, g.gamemode_id)})
    finally:
        cursor.close()

@ranking_bp.route("/daily-rank", methods=["GET"])
def get_daily_rank():
    """Return the X-User-Token user's rank for today's game"""
    user_token = user_token_from_header(request)
    if not user_token:
        return jsonify({"error": "Missing user token"}), 400
    connect = get_db()
    cursor = connect.cursor()
    try:
        result = RankingService(connect).get_daily_rank(cursor, user_token, g.gamemode_id)
        if result is None:
            return jsonify({"error": "Invalid user token"}), 400
        return jsonify(result), 200
    finally:
        cursor.close()
