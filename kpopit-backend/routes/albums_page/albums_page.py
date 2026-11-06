import logging
from flask import Blueprint, jsonify
from services.get_db import get_db
from services.albums_page_service import AlbumsPageService

albums_page_bp = Blueprint('albums_page', __name__)

logger = logging.getLogger(__name__)


@albums_page_bp.route("/albums-page", methods=["GET"])
def get_albums_page():
    """Every published album, for the albums list"""
    connect = get_db()
    cursor = connect.cursor()
    try:
        return jsonify(AlbumsPageService(connect).get_albums_page(cursor))
    except Exception:
        logger.exception("Error fetching albums page data")
        return jsonify({"error": "Could not load albums"}), 500
    finally:
        cursor.close()


@albums_page_bp.route("/albums-page/<int:album_id>", methods=["GET"])
def get_albums_page_album(album_id):
    """One published album with its artist and discography"""
    connect = get_db()
    cursor = connect.cursor()
    try:
        album = AlbumsPageService(connect).get_album(cursor, album_id)
        if not album:
            return jsonify({"error": "Album not found"}), 404
        return jsonify(album)
    except Exception:
        logger.exception("Error fetching album data")
        return jsonify({"error": "Internal Server Error"}), 500
    finally:
        cursor.close()
