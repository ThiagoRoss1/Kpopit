import logging
from flask import Blueprint, jsonify
from services.get_db import get_db
from services.profile_service import ProfileService
from utils.auth_helpers import validate_username
from utils.dates import get_today_date
from utils.rate_limiter import limiter

profile_bp = Blueprint("profile", __name__)

logger = logging.getLogger(__name__)


@profile_bp.route("/profile/<username>", methods=["GET"])
@limiter.limit("60 per minute")
def get_public_profile(username):
    """Public profile of a username, limited by its owner's visibility settings."""
    if validate_username(username):
        return jsonify({"error": "Profile not found"}), 404

    connect = get_db()
    cursor = connect.cursor()
    try:
        service = ProfileService(connect)
        owner = service.find_profile_owner(cursor, username)
        if not owner:
            return jsonify({"error": "Profile not found"}), 404
        return jsonify(service.public_profile(cursor, owner, get_today_date())), 200
    except Exception:
        logger.exception("Failed to load public profile")
        return jsonify({"error": "Could not load profile"}), 500
    finally:
        cursor.close()
