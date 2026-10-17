from flask import Blueprint, jsonify, g
from services.get_db import get_db
from services.yesterday_service import YesterdayService

game_logic_bp = Blueprint('game_logic', __name__)

FIRST_DAY = {"message": "First day - no yesterday pick to store"}

# Store yesterdays idol pick
@game_logic_bp.route("/store-yesterdays-idol")
def store_yesterdays_idol():
    """Store yesterday's idol pick in the database"""
    connect = get_db()
    cursor = connect.cursor()
    try:
        result = YesterdayService(connect).store_yesterdays_idol(cursor, g.gamemode_id)
        return jsonify(result if result is not None else FIRST_DAY)
    finally:
        cursor.close()

@game_logic_bp.route("/store-yesterdays-album")
def store_yesterdays_album():
    """Store yesterday's album pick in the database"""
    connect = get_db()
    cursor = connect.cursor()
    try:
        result = YesterdayService(connect).store_yesterdays_album(cursor, g.gamemode_id)
        return jsonify(result if result is not None else FIRST_DAY)
    finally:
        cursor.close()
