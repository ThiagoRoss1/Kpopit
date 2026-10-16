import logging
from flask import Blueprint, jsonify, request
import os
from dotenv import load_dotenv
from services.get_db import get_db
from utils.auth_decorators import require_admin

load_dotenv()

DB_URL = os.getenv("DB_URL")
BACKUP_KEY = os.getenv("BACKUP_KEY")

admin_bp = Blueprint('admin', __name__)

logger = logging.getLogger(__name__)
    
@admin_bp.route("/api/admin/add-idol", methods=["POST"])
@require_admin
def add_idol():
    data = request.json   

    nationality = ", ".join(data.get("nationality", [])) if isinstance(data.get("nationality"), list) else data.get("nationality", "")
    position = ", ".join(data.get("position", [])) if isinstance(data.get("position"), list) else data.get("position", "")
    is_published = bool(data.get("is_published", False))
    
    conn = get_db()
    cursor = conn.cursor()

    try:
        idol_id = data.get("id")

        if idol_id:
            cursor.execute("SELECT id FROM idols WHERE id = %s", (idol_id,))
            existing_id = cursor.fetchone()

            if existing_id:
                cursor.close()
                return jsonify({"error": f"Idol with ID {idol_id} already exists"}), 409
        
        cursor.execute("SELECT id FROM idols WHERE artist_name = %s", (data["artist_name"],))
        existing_name = cursor.fetchone()
        if existing_name:
            cursor.close()
            return jsonify({"error": "Idol with this artist name already exists", "idol_id": existing_name["id"]}), 409

        
        if idol_id:          
            idol_insert_sql = """
                INSERT INTO idols (
                id, artist_name, real_name, gender, debut_year, nationality, birth_date, height, position, image_path, is_published)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            idol_data = (
                idol_id,
                data["artist_name"],
                data.get("real_name"),
                data.get("gender"),
                data.get("debut_year"),
                nationality,
                data.get("birth_date"),
                data.get("height"),
                position,
                data.get("image_path"),
                is_published
            )
        else:
            idol_insert_sql = """
                INSERT INTO idols (
                artist_name, real_name, gender, debut_year, nationality, birth_date, height, position, image_path, is_published)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """

            idol_data = (
                data["artist_name"],
                data.get("real_name"),
                data.get("gender"),
                data.get("debut_year"),
                nationality,
                data.get("birth_date"),
                data.get("height"),
                position,
                data.get("image_path"),
                is_published
            )


        cursor.execute(idol_insert_sql, idol_data)

        if idol_id:
            final_idol_id = idol_id
        else:
            final_idol_id = cursor.fetchone()["id"]

        conn.commit()
        return jsonify({"message": "Idol added successfully", "idol_id": final_idol_id}), 201
    
    except Exception:
        conn.rollback()
        logger.exception("Failed to add idol")
        return jsonify({"error": "Failed to add idol"}), 500
    finally:
        cursor.close()
