from flask import Blueprint, jsonify
from services.get_db import get_db
from services.idol_service import IdolService

idol_bp = Blueprint('idols', __name__)

# Create idol list (For frontend check, list, dropdown...)
@idol_bp.route("/idols-list", methods=["GET"])
def get_idols_list():
    """Return a list of all idols with their id and names as JSON"""
    connect = get_db()
    cursor = connect.cursor()
    try:
        return jsonify(IdolService(connect).get_search_list(cursor))
    finally:
        cursor.close()
