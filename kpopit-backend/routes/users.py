import uuid
import json
import secrets
from datetime import datetime, timedelta, timezone
from services.get_db import get_db
from utils.dates import get_today_now, get_current_timestamp, get_today_date_str
from flask import Blueprint, request, jsonify, g
from utils.auth_decorators import require_auth
from repositories.user_repository import UserRepository
from utils.auth_helpers import validate_display_name, validate_username, validate_password
from utils.convert_to_webp import convert_to_webp_bytes
from utils.r2 import R2Client
from utils.rate_limiter import limiter
from services.auth_service import AuthService
import logging

user_bp = Blueprint('users', __name__)

logger = logging.getLogger(__name__)

# Generate a new user token and stores it in the database
@user_bp.route("/user/init", methods=["POST"])
def generate_user_token():
    """Generate a new user token and store it in the database"""
    token_sucessfuly_generated = False
    current_timestamp = get_current_timestamp()

    # Try up to 5 times
    attempts = 0
    error = ""

    while not token_sucessfuly_generated and attempts < 5:
        connect = None
        cursor = None
        try:
            token = str(uuid.uuid4())

            # Start db connection 
            connect = get_db()
            cursor = connect.cursor()
            
            token_insert_sql = """
                INSERT INTO users (token, created_at) VALUES (%s, %s)
            """
            cursor.execute(token_insert_sql, (token, current_timestamp))
            connect.commit()
            
            token_sucessfuly_generated = True
            
        except Exception as e:
            if connect is not None:
                connect.rollback()
            attempts += 1
            print(f"Token generation attempt {attempts} failed: {e}")
            error += str(e)
        
        finally:
            if cursor is not None:
                cursor.close()

    if token_sucessfuly_generated:
        return jsonify({"token": token})
    else:
        return jsonify({"error": "Failed to generate unique token after 5 attempts", "details": error}), 500
    
@user_bp.route("/stats/<user_token>", methods=["GET"])
def get_user_stats(user_token):
    """Return user stats based on the provided token"""
    gamemode_id = request.args.get("gamemode_id", default=1, type=int)

    # Start db connection
    connect = get_db()
    cursor = connect.cursor()

    # Validate user token 
    cursor.execute("""
            SELECT id FROM users WHERE token = %s
        """, (user_token,))
    
    user_row = cursor.fetchone()

    if not user_row:
        cursor.close()
        return jsonify({"error": "Invalid user token"}), 400
    
    user_id = user_row["id"]

    # Fetch user stats 
    cursor.execute("""
            SELECT current_streak, max_streak, wins_count, average_guesses, one_shot_wins
            FROM user_history
            WHERE user_id = %s AND gamemode_id = %s
        """, (user_id, gamemode_id))
    
    stats_row = cursor.fetchone()
    cursor.close()

    if stats_row:
        user_stats = stats_row
    else:
        user_stats = {
            "current_streak": 0,
            "max_streak": 0,
            "wins_count": 0,
            "average_guesses": 0.0,
            "one_shot_wins": 0
        }
    
    return jsonify(user_stats)

@user_bp.route("/game-state/<user_token>", methods=["GET", "POST"])
def get_game_state(user_token):
    """Return the current game state for the user"""
    gamemode_id = request.args.get("gamemode_id", default=1, type=int)

    today = get_today_date_str()
    # today = get_server_date()

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
    code_generated = False
    # Start db connection

    connect = get_db()
    cursor = connect.cursor()

    current_timestamp = get_current_timestamp()

    # Validate user token
    cursor.execute("""
            SELECT id FROM users WHERE token = %s
        """, (user_token,))
    
    user_row = cursor.fetchone()

    if not user_row:
        cursor.close()
        return jsonify({"error": "Invalid user token"}), 400

    # today = get_server_date()
    
    # Delete expired codes
    cursor.execute("""
            DELETE FROM transfer_data
            WHERE expires_at < %s
        """, (current_timestamp,))

    # Generate unique transfer code
    attempts = 0
    error = ""
    while not code_generated and attempts < 5:
        try:
            # Guarantee uniqueness by checking existing codes
            cursor.execute("""
                    SELECT code, expires_at FROM transfer_data
                    WHERE user_token = %s AND expires_at >= %s AND used = FALSE
                """, (user_token, current_timestamp))
            existing_code = cursor.fetchone()

            if existing_code:
                cursor.close()

                return jsonify({
                    "transfer_code": existing_code["code"],
                    "expires_at": existing_code["expires_at"]
                    })


            code = f"{secrets.token_hex(2)[:3].upper()}-{secrets.token_hex(2)[:3].upper()}"
            expires_at = get_today_now() + timedelta(days=3)
            # expires_at = get_server_datetime_now() + datetime.timedelta(days=3)

            # Insert transfer code into database
            cursor.execute("""
                INSERT INTO transfer_data (user_token, code, created_at, expires_at)
                VALUES (%s, %s, %s, %s)
            """, (user_token, code, current_timestamp, expires_at.isoformat()))
                
            connect.commit()
            code_generated = True

        except Exception as e:
            connect.rollback()
            attempts += 1
            print(f"Transfer code generation attempt {attempts} failed: {e}")
            error += str(e)

    cursor.close()

    if code_generated:
        return jsonify({"transfer_code": code, "expires_at": expires_at.isoformat()})
    else:
        return jsonify({"error": "Failed to generate unique transfer code after 5 attempts", "details": error}), 500
    
@user_bp.route("/transfer-data", methods=["POST"])
def transfer_data():
    """Transfer user data using a transfer code"""
    data = request.get_json()
    transfer_code = data.get("code")

    if not transfer_code:
        return jsonify({"error": "Missing transfer code"}), 400
    
    # Start db connection
    connect = get_db()
    cursor = connect.cursor()

    # Validate transfer code
    cursor.execute("""
            SELECT code, user_token, expires_at, used FROM transfer_data
            WHERE code = %s
        """, (transfer_code,))
        
    code_row = cursor.fetchone()

    if not code_row:
        cursor.close()
        return jsonify({"error": "Invalid transfer code"}), 400
    
    if code_row["used"]:
        cursor.close()
        return jsonify({"error": "Transfer code has already been used"}), 400
    
    expires_at = code_row["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)

    if expires_at < get_today_now():
    # if expires_at < get_server_datetime_now():
        cursor.close()
        return jsonify({"error": "Transfer code has expired"}), 400
    
    user_token = code_row["user_token"]

    # Mark code as used
    cursor.execute("""
            UPDATE transfer_data
            SET used = TRUE
            WHERE code = %s AND used = FALSE
        """, (transfer_code,))
    connect.commit()
    cursor.close()

    return jsonify({"user_token": user_token})

@user_bp.route("/get-active-transfer-code/<user_token>", methods=["GET"])
def get_active_transfer_code(user_token):
    """Get active transfer code if exists"""

    # today = get_server_datetime_now().isoformat()

    # Start db connection
    connect = get_db()
    cursor = connect.cursor()
    
    current_timestamp = get_current_timestamp()

    # Validate user token 
    cursor.execute("""
            SELECT id FROM users
            WHERE token = %s
        """, (user_token,))
    
    user_row = cursor.fetchone()

    if not user_row:
        cursor.close()
        return jsonify({"error": "Invalid user token"}), 400
    
    # Get active transfer code 
    cursor.execute("""
            SELECT code, expires_at FROM transfer_data
            WHERE user_token = %s AND used = FALSE AND expires_at >= %s
        """, (user_token, current_timestamp))
    
    result = cursor.fetchone()
    cursor.close()

    if result:
        return jsonify({
            "transfer_code": result["code"],
            "expires_at": result["expires_at"],
        })
    
    return jsonify({
            "transfer_code": None,
            "expires_at": None,
        })

@user_bp.route("/user/profile", methods=["PATCH"])
@require_auth
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

        if display_name:
            result["display_name"] = repository.update_display_name(cursor, user_id, display_name)

        if username:
            auth_fields = repository.find_auth_fields_by_id(cursor, user_id)
            if not auth_fields or not auth_fields.get("password_hash"):
                return jsonify({"error": "Current password is incorrect"}), 401
            if not AuthService(connect).verify_password(current_password, auth_fields["password_hash"]):
                return jsonify({"error": "Current password is incorrect"}), 401

            changed_at = auth_fields.get("username_changed_at")
            if changed_at:
                if changed_at.tzinfo is None:
                    changed_at = changed_at.replace(tzinfo=timezone.utc)
                days_since = (datetime.now(timezone.utc) - changed_at).days
                if days_since < 5:
                    return jsonify({"error": f"Username can only be changed once every 5 days. Please wait {5 - days_since} more day(s)."}), 400

            if repository.check_username_exists(cursor, username):
                return jsonify({"error": "Username already exists"}), 400

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

    print(f"[avatar] file received: {file.filename!r}, mimetype={file.mimetype}, content_length={file.content_length}")

    user_id = g.auth["user_id"]

    try:
        file_bytes = file.read()
        print(f"[avatar] read {len(file_bytes)} bytes from request")
        webp_image_bytes = convert_to_webp_bytes(file_bytes)
        print(f"[avatar] converted to webp: {len(webp_image_bytes)} bytes")
    
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
    """Change the password of the currently authenticated user.

    Requires the current password for re-authentication. Revokes all
    refresh tokens to force re-login on other devices.
    """
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
            return jsonify({"error": "Current password is incorrect"}), 401

        auth_service = AuthService(connect)
        if not auth_service.verify_password(current_password, auth_fields["password_hash"]):
            return jsonify({"error": "Current password is incorrect"}), 401

        new_hash = auth_service.hash_password(new_password)
        repository.update_password_hash(cursor, user_id, new_hash)
        repository.revoke_all_user_refresh_tokens(cursor, user_id)
        connect.commit()
        return jsonify({"message": "Password updated"}), 200

    except Exception:
        connect.rollback()
        logger.exception("Failed to change password")
        return jsonify({"error": "Failed to change password"}), 500

    finally:
        cursor.close()