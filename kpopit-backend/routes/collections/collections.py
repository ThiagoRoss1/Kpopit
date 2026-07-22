import logging
from flask import Blueprint, jsonify, g
from services.get_db import get_db
from services.collections_service import CollectionService
from utils.auth_decorators import optional_auth

logger = logging.getLogger(__name__)

collections_bp = Blueprint('collections', __name__)

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

@collections_bp.route("/collections/list", methods=["GET"])
@optional_auth
def collections_list():
    db = get_db()
    cursor = db.cursor()
    try:
        service = CollectionService(db)
        result = service.get_collections(cursor, resolve_user_id(cursor))
        return jsonify(result), 200
    except Exception:
        logger.exception("Error fetching collections list")
        return jsonify({"error": "An error occurred while fetching collections."}), 500
    finally:
        cursor.close()

def _album_response(collection_id):
    db = get_db()
    cursor = db.cursor()
    try:
        service = CollectionService(db)
        if not service.collection_exists(cursor, collection_id):
            return jsonify({"error": "Collection not found."}), 404
        result = service.get_album(cursor, resolve_user_id(cursor), collection_id)
        return jsonify(result), 200
    except Exception:
        logger.exception("Error fetching collection album (collection_id=%s)", collection_id)
        return jsonify({"error": "An error occurred while fetching collection album."}), 500
    finally:
        cursor.close()

# Collection_id is client input here — validated against `collections` (404 unknown).
@collections_bp.route("/collections/album/<int:collection_id>", methods=["GET"])
@optional_auth
def album(collection_id):
    return _album_response(collection_id)