import json
from datetime import timezone
from services.get_db import get_db
from utils.dates import get_current_timestamp, get_today_date_str, utc_now
from flask import Blueprint, request, jsonify, g
from utils.auth_decorators import require_auth
from repositories.user_repository import UserRepository
from utils.auth_helpers import validate_display_name, validate_username, validate_password
from utils.convert_to_webp import convert_to_webp_bytes
from utils.r2 import R2Client
from utils.rate_limiter import limiter
from services.auth_service import AuthService
from services.user_service import UserService
from services.transfer_service import TransferError, TransferService
import logging

user_bp = Blueprint('users', __name__)

logger = logging.getLogger(__name__)

# Generate a new user token and stores it in the database
@user_bp.route("/user/init", methods=["POST"])
def generate_user_token():
    """Generate a new user token and store it in the database"""
    current_timestamp = get_current_timestamp()
    token = None

    # Try up to 5 times
    for attempt in range(1, 6):
        connect = None
        cursor = None
        try:
            connect = get_db()
            cursor = connect.cursor()
            token = UserService(connect).create_anonymous_user(cursor, current_timestamp)
            break
        except Exception:
            if connect is not None:
                connect.rollback()
            logger.exception("Token generation attempt %s failed", attempt)
        finally:
            if cursor is not None:
                cursor.close()

    if token:
        return jsonify({"token": token})
    return jsonify({"error": "Failed to generate unique token after 5 attempts"}), 500

@user_bp.route("/stats/<user_token>", methods=["GET"])
def get_user_stats(user_token):
    """Return user stats based on the provided token"""
    gamemode_id = request.args.get("gamemode_id", default=1, type=int)
    connect = get_db()
    cursor = connect.cursor()
    try:
        stats = UserService(connect).get_stats(cursor, user_token, gamemode_id)
    finally:
        cursor.close()
    if stats is None:
        return jsonify({"error": "Invalid user token"}), 400
    return jsonify(stats)

@user_bp.route("/game-state/<user_token>", methods=["GET", "POST"])
def get_game_state(user_token):
    """Return the current game state for the user"""
    gamemode_id = request.args.get("gamemode_id", default=1, type=int)

    today = get_today_date_str()

    # Start db connection
    connect = get_db()
    cursor = connect.cursor()

    # Validate user token
    cursor.execute("""
            SELECT id FROM users
            WHERE token = %s
        """, (user_token,))
    
    user_row = cursor.fetchone()

    if not user_row:
        cursor.close()
        return jsonify({"error": "Invalid user token"}), 400
    
    user_id = user_row["id"]

    if request.method == "POST":
        data = request.get_json()
        game_state_json = json.dumps(data.get("game_state"))

        cursor.execute("""
                UPDATE daily_user_history
                SET game_state = %s
                WHERE user_id = %s AND date = %s AND gamemode_id = %s
            """, (game_state_json, user_id, today, gamemode_id))
        
        connect.commit()
        cursor.close()

        return jsonify({"message": "Game state updated successfully"}), 200
    
    else:
        cursor.execute("""
                SELECT game_state FROM daily_user_history
                WHERE user_id = %s AND date = %s AND gamemode_id = %s
            """, (user_id, today, gamemode_id))
        
        result = cursor.fetchone()
        cursor.close()

        if result and result["game_state"]:
            state = result["game_state"]

            if isinstance(state, str):
                return jsonify(json.loads(state))
            
            return jsonify(state)
        
        return jsonify({"game_state": None})
    
@user_bp.route("/generate-transfer-code/<user_token>", methods=["POST"])
def generate_transfer_code(user_token):
    """Generate a transfer code for the user to transfer their data to another device"""
    connect = get_db()
    cursor = connect.cursor()
    try:
        result = TransferService(connect).generate_code(cursor, user_token)
    except TransferError as err:
        return jsonify({"error": str(err)}), 400
    finally:
        cursor.close()
    if result is None:
        return jsonify({"error": "Failed to generate unique transfer code after 5 attempts"}), 500
    return jsonify(result)

@user_bp.route("/transfer-data", methods=["POST"])
def transfer_data():
    """Transfer user data using a transfer code"""
    data = request.get_json()
    transfer_code = data.get("code")

    if not transfer_code:
        return jsonify({"error": "Missing transfer code"}), 400

    connect = get_db()
    cursor = connect.cursor()
    try:
        return jsonify({"user_token": TransferService(connect).redeem(cursor, transfer_code)})
    except TransferError as err:
        return jsonify({"error": str(err)}), 400
    finally:
        cursor.close()

@user_bp.route("/get-active-transfer-code/<user_token>", methods=["GET"])
def get_active_transfer_code(user_token):
    """Get active transfer code if exists"""
    connect = get_db()
    cursor = connect.cursor()
    try:
        return jsonify(TransferService(connect).get_active_code(cursor, user_token))
    except TransferError as err:
        return jsonify({"error": str(err)}), 400
    finally:
        cursor.close()

@user_bp.route("/user/profile", methods=["PATCH"])
@require_auth
@limiter.limit("10 per minute; 30 per hour")
def update_display_name():
    """Update the user's display name and/or username.

    When `username` is being changed, `current_password` is required and
    verified, and the 5-day cooldown is enforced.
    """

    data = request.get_json() or {}
    display_name = data.get("display_name")
    username = data.get("username")
    current_password = data.get("current_password", "")

    if not display_name and not username:
        return jsonify({"error": "No display name or username provided"}), 400

    user_id = g.auth["user_id"]

    if display_name:
        display_name_error = validate_display_name(display_name)
        if display_name_error:
            return jsonify({"error": display_name_error}), 400

    if username:
        username_error = validate_username(username)
        if username_error:
            return jsonify({"error": username_error}), 400
        if not current_password:
            return jsonify({"error": "Current password is required to change username"}), 400

    connect = get_db()
    cursor = connect.cursor()

    try:
        repository = UserRepository(connect)
        result = {}

        if username:
            auth_fields = repository.find_auth_fields_by_id(cursor, user_id)
            if not auth_fields or not auth_fields.get("password_hash"):
                return jsonify({"error": "Current password is incorrect"}), 403
            
            if not AuthService(connect).verify_password(current_password, auth_fields["password_hash"]):
                return jsonify({"error": "Current password is incorrect"}), 403

            changed_at = auth_fields.get("username_changed_at")
            if changed_at:
                if changed_at.tzinfo is None:
                    changed_at = changed_at.replace(tzinfo=timezone.utc)
                days_since = (utc_now() - changed_at).days

                if days_since < 5:
                    return jsonify({"error": f"Username can only be changed once every 5 days. Please wait {5 - days_since} more day(s)."}), 400

            if repository.check_username_exists(cursor, username):
                return jsonify({"error": "Username already exists"}), 400
            
        if display_name:
            result["display_name"] = repository.update_display_name(cursor, user_id, display_name)

        if username:    
            result["username"] = repository.update_username(cursor, user_id, username)

        connect.commit()
        return jsonify(result), 200

    except Exception:
        connect.rollback()
        logger.exception("Failed to update profile")
        return jsonify({"error": "Failed to update profile"}), 500

    finally:
        cursor.close()

@user_bp.route("/user/avatar", methods=["PATCH"])
@require_auth
def update_avatar():
    """Update the user's avatar URL (Kpopit idol's picture)"""
    data = request.get_json()
    avatar_url = data.get("avatar_url")

    if not avatar_url:
        return jsonify({"error": "Missing avatar_url"}), 400
    
    connect = get_db()
    cursor = connect.cursor()

    try:
        cursor.execute(
            """
                SELECT id FROM idols WHERE image_path = %s
            """, (avatar_url,)
        )
        idol = cursor.fetchone()

        if not idol:
            return jsonify({"error": "Invalid avatar_url"}), 400
        

        user_id = g.auth["user_id"]
        repository = UserRepository(connect)
        repository.update_avatar(cursor, user_id, avatar_url)

        connect.commit()
        return jsonify({"avatar_url": avatar_url}), 200
    
    except Exception:
        connect.rollback()
        logger.exception("Failed to update avatar")
        return jsonify({"error": "Failed to update avatar"}), 500
    
    finally:
        cursor.close()

@user_bp.route("/user/avatar", methods=["POST"])
@require_auth
@limiter.limit("3 per minute; 10 per hour")
def update_avatar_webp():
    """Update the user's avatar URL with a image provided by user and transformed to webp"""
    file = request.files.get("avatar")

    if not file:
        return jsonify({"error": "Missing avatar file"}), 400

    user_id = g.auth["user_id"]

    try:
        file_bytes = file.read()
        webp_image_bytes = convert_to_webp_bytes(file_bytes)
    
    except Exception:
        logger.exception("Failed to convert image to webp")
        return jsonify({"error": "Failed to process image file"}), 400
    
    try:
        r2_client = R2Client()
        key = r2_client.upload_file(user_id, webp_image_bytes)

    except Exception:
        logger.exception("Failed to upload avatar image to R2")
        return jsonify({"error": "Failed to upload avatar image"}), 500

    connect = get_db()
    cursor = connect.cursor()

    try:
        repository = UserRepository(connect)
        repository.update_avatar(cursor, user_id, key)
        connect.commit()
        return jsonify({"avatar_url": key}), 200

    except Exception:
        connect.rollback()
        logger.exception("Failed to update avatar with webp image")
        return jsonify({"error": "Failed to update avatar with webp image"}), 500

    finally:
        cursor.close()

@user_bp.route("/user/change-password", methods=["PATCH"])
@require_auth
@limiter.limit("5 per hour")
def change_password():
    """Change the authenticated user's password (current password required).
    Revokes the user's other refresh sessions and keeps the one this access token came from (`sid`);
    a token without `sid` can't name its session, so then all are revoked. Other access tokens
    stay valid until they expire (≤1 h)."""
    data = request.get_json() or {}
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")
    confirm_password = data.get("confirm_password", "")

    if not current_password:
        return jsonify({"error": "Current password is required"}), 400
    if new_password != confirm_password:
        return jsonify({"error": "New passwords do not match"}), 400

    err = validate_password(new_password)
    if err:
        return jsonify({"error": err}), 400

    user_id = g.auth["user_id"]
    connect = get_db()
    cursor = connect.cursor()

    try:
        repository = UserRepository(connect)
        auth_fields = repository.find_auth_fields_by_id(cursor, user_id)

        if not auth_fields or not auth_fields.get("password_hash"):
            return jsonify({"error": "Current password is incorrect"}), 403

        auth_service = AuthService(connect)
        if not auth_service.verify_password(current_password, auth_fields["password_hash"]):
            return jsonify({"error": "Current password is incorrect"}), 403

        new_hash = auth_service.hash_password(new_password)
        repository.update_password_hash(cursor, user_id, new_hash)
        repository.revoke_other_refresh_tokens(cursor, user_id, keep_id=g.auth["payload"].get("sid"))
        connect.commit()
        return jsonify({"message": "Password updated"}), 200

    except Exception:
        connect.rollback()
        logger.exception("Failed to change password")
        return jsonify({"error": "Failed to change password"}), 500

    finally:
        cursor.close()