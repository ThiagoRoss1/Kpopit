from flask import Blueprint, jsonify, g
from services.get_db import get_db
from utils.dates import get_today_date
from datetime import timedelta

game_logic_bp = Blueprint('game_logic', __name__)

# Store yesterdays idol pick
@game_logic_bp.route("/store-yesterdays-idol")
def store_yesterdays_idol():
    """Store yesterday's idol pick in the database"""
    print(f"Gamemode id {g.gamemode_id}")
    
    # Start db connection
    connect = get_db()
    cursor = connect.cursor()

    # Gey yesterday's date
    yesterday = get_today_date() - timedelta(days=1)
    yesterday_str = yesterday.isoformat()

    # Get idol id for yesterday
    select_sql = """
        SELECT idol_id FROM daily_picks WHERE pick_date = ? AND gamemode_id = ?
    """
    cursor.execute(select_sql, (yesterday_str, g.gamemode_id,))
    result = cursor.fetchone()

    if result:
        # Insert or Update yesterday's pick
        insert_sql = """
            INSERT INTO yesterday_picks (past_idol_id, yesterdays_pick_date, gamemode_id)
            VALUES (?, ?, ?)
            ON CONFLICT(yesterdays_pick_date, gamemode_id)
            DO UPDATE SET past_idol_id = excluded.past_idol_id
        """
        cursor.execute(insert_sql, (result["idol_id"], yesterday_str, g.gamemode_id))

        connect.commit()
    
        # --- Fetch idol name ---
        name_sql = """
            SELECT artist_name FROM idols WHERE id = ?
        """
        cursor.execute(name_sql, (result["idol_id"],))
        artist_name = cursor.fetchone()["artist_name"]

        # --- Fetch idol group ---
        group_sql = """
            SELECT g.name FROM groups AS g
            LEFT JOIN idol_career AS ic ON g.id = ic.group_id
            WHERE ic.idol_id = ? AND ic.is_active = 1
        """

        # Remove left join after testing (not all idols have a career entry)

        cursor.execute(group_sql, (result["idol_id"],))
        group_result = cursor.fetchone()

         # --- Fetch idol image ---
        image_sql = """
            SELECT image_path, image_version FROM idols WHERE id = ?
        """

        cursor.execute(image_sql, (result["idol_id"],))
        image_result = cursor.fetchone()
        image_path = image_result["image_path"] if image_result else None
        image_version = image_result["image_version"] if image_result else "1"

        

        return jsonify({
            "past_idol_id": result["idol_id"], 
            "yesterdays_pick_date": yesterday_str,
            "artist_name": artist_name,
            "groups": [group_result["name"]] if group_result else [],
            "image_path": image_path,
            "image_version": image_version
        })

    else:      
        return jsonify({"message": "First day - no yesterday pick to store"})
    