import sqlite3
from flask import Blueprint, jsonify, request
# from flask_babel import Babel
# from flask_session import Session
admin_bp = Blueprint('admin', __name__)


def init_db():
    connect = sqlite3.connect("kpopdle-teste.db")
    cursor = connect.cursor()
    return connect, cursor
    


@admin_bp.route("/api/admin/add-idol", methods=["POST"])
def add_idol():
    data = request.json   

    nationality = ", ".join(data.get("nationality", [])) if isinstance(data.get("nationality"), list) else data.get("nationality", "")
    position = ", ".join(data.get("position", [])) if isinstance(data.get("position"), list) else data.get("position", "")
    is_published = 1 if data.get("is_published") else 0
    
    connect, cursor = init_db()
    connect.row_factory = sqlite3.Row

    idol_id = data.get("id")
    if idol_id:
        cursor.execute("SELECT id FROM idols WHERE id = ?", (idol_id,))
        existing_id = cursor.fetchone()
        if existing_id:
            connect.close()
            return jsonify({"error": f"Idol with ID {idol_id} already exists"}), 409
    
    cursor.execute("SELECT id FROM idols WHERE artist_name = ?", (data["artist_name"],))
    existing_name = cursor.fetchone()
    if existing_name:
        connect.close()
        return jsonify({"error": "Idol with this artist name already exists", "idol_id": existing_name["id"]}), 409

    
    if idol_id:          
        idol_insert_sql = """
            INSERT INTO idols (
            id, artist_name, real_name, gender, debut_year, nationality, birth_date, height, position, image_path, is_published)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    connect.commit()
    final_idol_id = idol_id if idol_id else cursor.lastrowid
    connect.close()

    return jsonify({"message": "Idol added successfully", "idol_id": final_idol_id}), 201
    