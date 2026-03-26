import uuid
import json
import secrets
from datetime import datetime, timedelta
from services.get_db import get_db
from utils.dates import get_today_now, get_current_timestamp, get_today_date_str
from flask import Blueprint, request, jsonify

user_bp = Blueprint('users', __name__)

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