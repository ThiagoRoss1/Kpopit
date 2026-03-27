from flask import Blueprint, jsonify, request, send_file
import os
from dotenv import load_dotenv
from services.get_db import get_db

load_dotenv()

DB_URL = os.getenv("DB_URL")
BACKUP_KEY = os.getenv("BACKUP_KEY")

admin_bp = Blueprint('admin', __name__)
    
@admin_bp.route("/api/admin/add-idol", methods=["POST"])
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
    
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()


# @admin_bp.route("/api/admin/download-backup", methods=["GET"])
# def download_backup():
#     key = request.args.get("key")

#     if not BACKUP_KEY:
#         return jsonify({"error": "Backup key not configured on server"}), 500
    
#     if key != BACKUP_KEY:
#         return jsonify({"error": "Invalid backup key"}), 403

#     if os.path.exists(DB_URL):
#         try:
#             return send_file(DB_URL, as_attachment=True, download_name="kpopit-backup.db")
#         except Exception as e:
#             return jsonify({"error": f"Failed to send file: {str(e)}"}), 500
        
#     else:
#         return jsonify({"error": f"Backup file not found: {DB_URL}"}), 404

# Already have backup functionality in backup_service.py that uploads to S3, so no need for this endpoint to download directly from server. Can implement S3 download if needed in the future.