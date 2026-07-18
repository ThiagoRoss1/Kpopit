import logging
from flask import Blueprint, jsonify, g
from services.get_db import get_db
from services.collection_service import CollectionService
from utils.auth_decorators import optional_auth

logger = logging.getLogger(__name__)

collection_bp = Blueprint('collection', __name__)

def resolve_user_id(cursor):
    """Resolve the ownership user_id for a collection read.

    JWT users carry a resolved user_id in g.auth. detect_user() does NOT touch
    the DB for anonymous users, so the anonymous UUID must be looked up here
    (same resolution the guess routes do) — otherwise anonymous users never see
    the cards they own. Unresolvable identity degrades to None (catalog visible,
    nothing owned)."""
    auth = g.auth
    if auth["source"] == "jwt":
        return auth["user_id"]
    if auth["source"] == "anonymous":
        cursor.execute("SELECT id FROM users WHERE token = %s", (auth["token"],))
        user_row = cursor.fetchone()
        return user_row["id"] if user_row else None
    return None

@collection_bp.route("/collection/overview", methods=["GET"])
@optional_auth
def overview():
    db = get_db()
    cursor = db.cursor()
    try:
        service = CollectionService(db)
        result = service.get_overview(cursor, resolve_user_id(cursor))
        return jsonify(result), 200
    except Exception:
        logger.exception("Error fetching collection overview")
        return jsonify({"error": "An error occurred while fetching collection overview."}), 500
    finally:
        cursor.close()

@collection_bp.route("/collection/album", methods=["GET"])
@optional_auth
def album():
    db = get_db()
    cursor = db.cursor()
    try:
        service = CollectionService(db)
        result = service.get_album(cursor, resolve_user_id(cursor))
        return jsonify(result), 200
    except Exception:
        logger.exception("Error fetching collection album")
        return jsonify({"error": "An error occurred while fetching collection album."}), 500
    finally:
        cursor.close()

@collection_bp.route("/collection/groups/<int:group_id>", methods=["GET"])
@optional_auth
def group_page(group_id):
    db = get_db()
    cursor = db.cursor()
    try:
        service = CollectionService(db)
        result = service.get_group_page(cursor, resolve_user_id(cursor), group_id)
        if result is None:
            return jsonify({"error": "Group page not found."}), 404
        return jsonify(result), 200
    except Exception:
        logger.exception("Error fetching collection group page (group_id=%s)", group_id)
        return jsonify({"error": "An error occurred while fetching group page."}), 500
    finally:
        cursor.close()