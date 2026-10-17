import logging
from flask import Blueprint, jsonify
from services.get_db import get_db
from services.idol_service import IdolService

idols_page_bp = Blueprint('idols_page', __name__)

logger = logging.getLogger(__name__)

@idols_page_bp.route("/idols-page", methods=["GET"])
def get_idols_page():
    """Return a list of all idols in game as JSON"""
    connect = get_db()
    cursor = connect.cursor()
    try:
        return jsonify(IdolService(connect).get_idols_page(cursor))
    except Exception:
        logger.exception("Error fetching idols page data")
        return jsonify({"error": "Could not load idols"}), 500
    finally:
        cursor.close()

@idols_page_bp.route("/idols-page/<int:idol_id>", methods=["GET"])
def get_idols_page_idol(idol_id):
    """Return detailed information about a specific idol by ID as JSON"""
    connect = get_db()
    cursor = connect.cursor()
    try:
        profile = IdolService(connect).get_idol_profile(cursor, idol_id)
        if not profile:
            return jsonify({"error": "Idol not found"}), 404
        return jsonify(profile)
    except Exception:
        logger.exception("Error fetching idol data")
        return jsonify({"error": "Internal Server Error"}), 500
    finally:
        cursor.close()
