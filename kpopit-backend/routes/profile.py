import logging
from flask import Blueprint, g, jsonify, request, url_for
from repositories.user_repository import UserRepository
from services import xp_service
from services.calendar_service import MODES
from services.get_db import get_db
from services.profile_service import ProfileService
from services.profile_stats import ProfileStats
from services.xp_service import XpService, level_threshold
from utils.auth_decorators import optional_auth
from utils.auth_helpers import user_token_from_header, validate_username
from utils.dates import get_today_date
from utils.rate_limiter import limiter

profile_bp = Blueprint("profile", __name__)

logger = logging.getLogger(__name__)


def _private(response, status: int = 200):
    """Profile answers depend on who is looking (owner, visitor, anti-spoiler), so nothing is cached."""
    response.status_code = status
    response.headers["Cache-Control"] = "no-store"
    return response


def _hero_xp(connect, cursor, owner_id: int) -> dict | None:
    """The owner's current Idol XP idol for the profile button; None while the feature is off."""
    if not xp_service.IDOL_XP_ENABLED:
        return None
    state = XpService(connect).state(cursor, owner_id)
    current = state["current"]
    if not current:
        return {"current": None}
    idol = next((i for i in state["idols"] if i["idol_id"] == current["idol_id"]), None)
    xp = idol["xp"] if idol else 0
    level = idol["level"] if idol else 0
    return {"current": {
        "idol_id": current["idol_id"], "artist_name": current["artist_name"], "image_path": current["image_path"],
        "xp": xp, "level": level, "level_xp": level_threshold(level),
        "next_level_xp": idol["next_level_xp"] if idol else level_threshold(1),
    }}


def _not_found():
    return _private(jsonify({"error": "Profile not found"}), 404)


def _viewable_owner(service: ProfileService, cursor, username: str) -> tuple[dict | None, int | None]:
    """(owner, viewer_id) for the sub-routes; owner is None when unknown or private for this viewer."""
    if validate_username(username):
        return None, None
    owner = service.find_profile_owner(cursor, username)
    viewer_id = service.viewer_id(cursor, g.auth, user_token_from_header(request))
    if not owner or not service.can_view(owner, viewer_id):
        return None, viewer_id
    return owner, viewer_id


@profile_bp.route("/profile/<username>", methods=["GET"])
@optional_auth
@limiter.limit("60 per minute")
def get_public_profile(username):
    """Public profile of a username, limited by its owner's visibility settings."""
    if validate_username(username):
        return _not_found()

    connect = get_db()
    cursor = connect.cursor()
    try:
        service = ProfileService(connect)
        owner = service.find_profile_owner(cursor, username)
        if not owner:
            # A name renamed in the last 15 days points to the account's current name. Temporary and
            # never cached: once the reservation ends the name may belong to someone else.
            renamed = UserRepository(connect).find_reservation_owner(cursor, username)
            if renamed:
                response = jsonify({"redirect_to": renamed["username"]})
                response.headers["Location"] = url_for("profile.get_public_profile", username=renamed["username"])
                return _private(response, 302)
            return _not_found()
        viewer_id = service.viewer_id(cursor, g.auth, user_token_from_header(request))
        hero_xp = _hero_xp(connect, cursor, owner["id"]) if service.can_view(owner, viewer_id) else None
        return _private(jsonify(service.public_profile(cursor, owner, get_today_date(), viewer_id, hero_xp)))
    except Exception:
        logger.exception("Failed to load public profile")
        return _private(jsonify({"error": "Could not load profile"}), 500)
    finally:
        cursor.close()


@profile_bp.route("/profile/<username>/stats", methods=["GET"])
@optional_auth
@limiter.limit("60 per minute")
def get_profile_stats(username):
    connect = get_db()
    cursor = connect.cursor()
    try:
        service = ProfileService(connect)
        owner, viewer_id = _viewable_owner(service, cursor, username)
        if owner is None:
            return _not_found()
        stats = ProfileStats().stats(cursor, owner["id"], get_today_date(), include_today_guesses=owner["id"] == viewer_id)
        return _private(jsonify(stats))
    except Exception:
        logger.exception("Failed to load profile stats")
        return _private(jsonify({"error": "Could not load stats"}), 500)
    finally:
        cursor.close()


@profile_bp.route("/profile/<username>/history", methods=["GET"])
@optional_auth
@limiter.limit("60 per minute")
def get_profile_history(username):
    """Match history with the anti-spoiler rule (see ProfileService.history). ?mode=classic|blurry|pixelated
    and ?offset= page through it."""
    mode_name = request.args.get("mode")
    if mode_name and mode_name not in MODES:
        return _private(jsonify({"error": "Unknown mode"}), 400)
    offset = request.args.get("offset", "0")
    if not offset.isdigit():
        return _private(jsonify({"error": "Invalid offset"}), 400)

    connect = get_db()
    cursor = connect.cursor()
    try:
        service = ProfileService(connect)
        owner, viewer_id = _viewable_owner(service, cursor, username)
        if owner is None:
            return _not_found()
        if owner["id"] != viewer_id and not owner["show_match_history"]:
            return _private(jsonify({"error": "Match history is hidden"}), 403)
        history = service.history(cursor, owner["id"], viewer_id, get_today_date(),
                                  MODES.get(mode_name) if mode_name else None, int(offset))
        return _private(jsonify(history))
    except Exception:
        logger.exception("Failed to load profile history")
        return _private(jsonify({"error": "Could not load history"}), 500)
    finally:
        cursor.close()
