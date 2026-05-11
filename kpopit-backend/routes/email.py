import os
from flask import Blueprint, request, jsonify, g
from utils.auth_decorators import require_auth
from utils.auth_helpers import validate_password
from services.email_service import EmailService
from services.get_db import get_db
from repositories.user_repository import UserRepository
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from services.auth_service import AuthService
from utils.rate_limiter import limiter
import logging

email_bp = Blueprint('email', __name__)

EMAIL_FRONTEND_URL = os.getenv("EMAIL_FRONTEND_URL")

logger = logging.getLogger(__name__)

@email_bp.route("/email/send-verification-email", methods=["POST"])
@require_auth
@limiter.limit("3 per hour; 5 per day")
def send_verification_email():
    """Endpoint to trigger sending an email verification link to the authenticated user."""
    user_id = g.auth["user_id"]

    connect = get_db()
    cursor = connect.cursor()

    try:
        repo = UserRepository(connect)
        user = repo.find_by_id(cursor, user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404
        
        if user["email_verified"]:
            return jsonify({"error": "Email is already verified"}), 400
        
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

        # Delete previous unused tokens for this user
        cursor.execute(
            """
                DELETE FROM email_verification_tokens
                WHERE user_id = %s
                AND token_type = 'verify_email'
                AND used_at IS NULL
            """, (user_id,)
        )

        # Insert new token into the database
        cursor.execute(
            """
                INSERT INTO email_verification_tokens (user_id, token_hash, token_type, expires_at)
                VALUES (%s, %s, 'verify_email', %s)
            """, (user_id, token_hash, expires_at)
        )

        connect.commit()

        # Send email
        verification_url = f"{EMAIL_FRONTEND_URL}/verify-email?token={raw_token}"
        email_sent = EmailService.send_email_verification(
            to_email=user["email"],
            username=user["username"],
            verification_link=verification_url
        )

        if email_sent:
            return jsonify({"message": "Verification email sent"}), 200
        else:
            return jsonify({"error": "Failed to send verification email"}), 500
    
    except Exception:
        connect.rollback()
        logger.exception("Failed to send verification email")
        return jsonify({"error": "Failed to send verification email"}), 500
    
    finally:
        cursor.close()

@email_bp.route("/email/verify-email", methods=["POST"])
@limiter.limit("10 per hour")
def verify_email():
    """Endpoint to verify email using the token sent to the user's email address."""
    data = request.get_json()
    raw_token = data.get("token")

    if not raw_token:
        return jsonify({"error": "Missing token"}), 400
    
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    connect = get_db()
    cursor = connect.cursor()

    try:
        cursor.execute(
            """
                SELECT id, user_id, expires_at, used_at 
                FROM email_verification_tokens
                WHERE token_hash = %s AND token_type = 'verify_email'
            """, (token_hash,)
        )
        token_record = cursor.fetchone()

        if not token_record:
            return jsonify({"error": "Invalid token"}), 400
        
        if token_record["used_at"]:
            return jsonify({"error": "Token has already been used"}), 400
        
        if token_record["expires_at"] < datetime.now(timezone.utc):
            return jsonify({"error": "Token has expired"}), 400
        
        cursor.execute(
            """
                UPDATE email_verification_tokens
                SET used_at = NOW()
                WHERE id = %s
            """, (token_record["id"],)
        )

        cursor.execute(
            """
                UPDATE users
                SET email_verified = TRUE
                WHERE id = %s
            """, (token_record["user_id"],)
        )

        connect.commit()
        return jsonify({"message": "Email verified successfully"}), 200
    
    except Exception:
        logger.exception("Error verifying email")
        return jsonify({"error": "Error verifying email"}), 500
    
    finally:
        cursor.close()

@email_bp.route("/email/forgot-password", methods=["POST"])
@limiter.limit("3 per hour; 5 per day")
def forgot_password():
    """Endpoint to trigger sending a password reset link to the user's email address."""
    data = request.get_json()
    email = data.get("email")

    if not email:
        return jsonify({"error": "Missing email"}), 400

    connect = get_db()
    cursor = connect.cursor()

    try:
        repo = UserRepository(connect)
        user = repo.find_by_email(cursor, email)

        if not user:
            return jsonify({"message": "If an account with that email exists, a password reset link has been sent"}), 200
        
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

        cursor.execute(
            """
                DELETE FROM email_verification_tokens
                WHERE user_id = %s
                AND token_type = 'password_reset'
                AND used_at IS NULL
            """, (user["id"],)
        )

        cursor.execute(
            """
                INSERT INTO email_verification_tokens (user_id, token_hash, token_type, expires_at)
                VALUES (%s, %s, 'password_reset', %s)
            """, (user["id"], token_hash, expires_at)
        )

        connect.commit()

        # Send password reset email
        reset_url = f"{EMAIL_FRONTEND_URL}/reset-password?token={raw_token}"
        EmailService.send_password_reset(
            to_email=user["email"],
            username=user["username"],
            reset_link=reset_url
        )

        return jsonify({"message": "If an account with that email exists, a password reset link has been sent"}), 200
        
    except Exception:
        connect.rollback()
        logger.exception("Failed to send password reset email")
        return jsonify({"error": "Failed to send password reset email"}), 500
    
    finally:
        cursor.close()

@email_bp.route("/email/reset-password", methods=["POST"])
@limiter.limit("5 per hour; 10 per day")
def reset_password():
    """Endpoint to reset the user's password using the token sent to their email address."""
    data = request.get_json()
    raw_token = data.get("token")
    new_password = data.get("password")

    if not raw_token:
        return jsonify({"error": "Missing token"}), 400

    password_error = validate_password(new_password)
    if password_error:
        return jsonify({"error": password_error}), 400

    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    connect = get_db()
    cursor = connect.cursor()

    auth_service = AuthService(connect)

    try:
        cursor.execute(
            """
                SELECT id, user_id, expires_at, used_at
                FROM email_verification_tokens
                WHERE token_hash = %s AND token_type = 'password_reset'
            """, (token_hash,)
        )
        token_record = cursor.fetchone()

        if not token_record:
            return jsonify({"error": "Invalid token"}), 400
        if token_record["used_at"]:
            return jsonify({"error": "Token has already been used"}), 400
        if token_record["expires_at"] < datetime.now(timezone.utc):
            return jsonify({"error": "Token has expired"}), 400
        
        password_hash = auth_service.hash_password(new_password)

        cursor.execute(
            """
                UPDATE users SET password_hash = %s WHERE id = %s
            """, (password_hash, token_record["user_id"])
        )

        cursor.execute(
            """
                UPDATE email_verification_tokens
                SET used_at = NOW()
                WHERE id = %s
            """, (token_record["id"],)
        )

        connect.commit()
        return jsonify({"message": "Password reset successfully"}), 200
    
    except Exception:
        connect.rollback()
        logger.exception("Error resetting password")
        return jsonify({"error": "Error resetting password"}), 500
    
    finally:
        cursor.close()