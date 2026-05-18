import os
import psycopg
from flask import Blueprint, request, jsonify, g, json
from utils.auth_decorators import require_auth
from utils.auth_helpers import validate_password, validate_and_normalize_email
from services.email_service import EmailService
from services.get_db import get_db
from repositories.user_repository import UserRepository
import secrets
import hashlib
from datetime import timedelta
from utils.dates import get_datetime_now_utc
from services.auth_service import AuthService
from utils.rate_limiter import limiter
import logging

email_bp = Blueprint('email', __name__)

RESEND_EMAIL_FRONTEND_URL = os.getenv("RESEND_EMAIL_FRONTEND_URL")

logger = logging.getLogger(__name__)

@email_bp.route("/auth/email/send-verification-email", methods=["POST"])
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
        expires_at = get_datetime_now_utc() + timedelta(hours=24)

        # Delete previous unused tokens for this user
        cursor.execute(
            """
                DELETE FROM email_tokens
                WHERE user_id = %s
                AND token_type = 'verify_email'
                AND used_at IS NULL
            """, (user_id,)
        )

        # Insert new token into the database
        cursor.execute(
            """
                INSERT INTO email_tokens (user_id, token_hash, token_type, expires_at)
                VALUES (%s, %s, 'verify_email', %s)
            """, (user_id, token_hash, expires_at)
        )

        connect.commit()

        # Send email
        verification_url = f"{RESEND_EMAIL_FRONTEND_URL}/verify-email?token={raw_token}"
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

@email_bp.route("/auth/email/verify-email", methods=["POST"])
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
                FROM email_tokens
                WHERE token_hash = %s AND token_type = 'verify_email'
            """, (token_hash,)
        )
        token_record = cursor.fetchone()

        if not token_record:
            return jsonify({"error": "Invalid token"}), 400
        
        if token_record["used_at"]:
            return jsonify({"error": "Token has already been used"}), 400
        
        if token_record["expires_at"] < get_datetime_now_utc():
            return jsonify({"error": "Token has expired"}), 400
        
        cursor.execute(
            """
                UPDATE email_tokens
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

@email_bp.route("/auth/email/forgot-password", methods=["POST"])
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
        expires_at = get_datetime_now_utc() + timedelta(hours=1)

        cursor.execute(
            """
                DELETE FROM email_tokens
                WHERE user_id = %s
                AND token_type = 'password_reset'
                AND used_at IS NULL
            """, (user["id"],)
        )

        cursor.execute(
            """
                INSERT INTO email_tokens (user_id, token_hash, token_type, expires_at)
                VALUES (%s, %s, 'password_reset', %s)
            """, (user["id"], token_hash, expires_at)
        )

        connect.commit()

        # Send password reset email
        reset_url = f"{RESEND_EMAIL_FRONTEND_URL}/reset-password?token={raw_token}"
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

@email_bp.route("/auth/email/reset-password", methods=["POST"])
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
                FROM email_tokens
                WHERE token_hash = %s AND token_type = 'password_reset'
            """, (token_hash,)
        )
        token_record = cursor.fetchone()

        if not token_record:
            return jsonify({"error": "Invalid token"}), 400
        if token_record["used_at"]:
            return jsonify({"error": "Token has already been used"}), 400
        if token_record["expires_at"] < get_datetime_now_utc():
            return jsonify({"error": "Token has expired"}), 400
        
        password_hash = auth_service.hash_password(new_password)

        cursor.execute(
            """
                UPDATE users SET password_hash = %s WHERE id = %s
            """, (password_hash, token_record["user_id"])
        )

        cursor.execute(
            """
                UPDATE email_tokens
                SET used_at = NOW()
                WHERE id = %s
            """, (token_record["id"],)
        )

        # Kill every existing session for this user by revoking all their refresh tokens
        auth_service.user_repo.revoke_all_user_refresh_tokens(cursor, token_record["user_id"])

        connect.commit()
        return jsonify({"message": "Password reset successfully"}), 200
    
    except Exception:
        connect.rollback()
        logger.exception("Error resetting password")
        return jsonify({"error": "Error resetting password"}), 500
    
    finally:
        cursor.close()

@email_bp.route("/auth/email/request-email-change", methods=["PATCH"])
@require_auth
@limiter.limit("3 per hour; 5 per day")
def request_email_change():
    """Endpoint to request an email change, which sends a confirmation link to the new email address."""
    user_id = g.auth["user_id"]
    data = request.get_json() or {}
    new_email = validate_and_normalize_email(data.get("new_email"))
    current_password = data.get("current_password", "")

    if not new_email:
        return jsonify({"error": "Invalid or missing new_email"}), 400

    if not current_password:
        return jsonify({"error": "Current password is required to change email"}), 400

    connect = get_db()
    cursor = connect.cursor()

    try:
        repo = UserRepository(connect)
        user = repo.find_by_id(cursor, user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        auth_fields = repo.find_auth_fields_by_id(cursor, user_id)
        if not auth_fields or not auth_fields.get("password_hash"):
            return jsonify({"error": "Current password is incorrect"}), 401
        if not AuthService(connect).verify_password(current_password, auth_fields["password_hash"]):
            return jsonify({"error": "Current password is incorrect"}), 401

        conflict = repo.find_by_email(cursor, new_email)
        if conflict and conflict["id"] != user_id:
            return jsonify({"error": "Email is already in use"}), 400
        
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        expires_at = get_datetime_now_utc() + timedelta(hours=24)


        metadata = {"new_email": new_email}

        cursor.execute(
            """
                DELETE FROM email_tokens
                WHERE user_id = %s
                AND token_type = 'email_change'
                AND used_at IS NULL
            """, (user_id,)
        )

        cursor.execute(
            """
                INSERT INTO email_tokens (user_id, token_hash, token_type, expires_at, metadata)
                VALUES (%s, %s, 'email_change', %s, %s)
            """, (user_id, token_hash, expires_at, json.dumps(metadata))
        )

        connect.commit()

        # Send confirmation email to new address
        confirmation_url = f"{RESEND_EMAIL_FRONTEND_URL}/confirm-email-change?token={raw_token}"
        EmailService.send_email_change_link(
            to_email=new_email,
            username=user["username"],
            email_change_link=confirmation_url
        )

        return jsonify({"message": "Email change confirmation sent to the new email address"}), 200
    
    except Exception:
        connect.rollback()
        logger.exception("Failed to request email change")
        return jsonify({"error": "Failed to request email change"}), 500   

    finally:
        cursor.close()

@email_bp.route("/auth/email/confirm-email-change", methods=["POST"])
@limiter.limit("3 per hour; 5 per day")
def confirm_email_change():
    """Endpoint to confirm the email change using the token sent to the new email address."""
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
                SELECT id, user_id, expires_at, used_at, metadata
                FROM email_tokens
                WHERE token_hash = %s AND token_type = 'email_change'
            """, (token_hash,)
        )
        token_record = cursor.fetchone()

        if not token_record:
            return jsonify({"error": "Invalid token"}), 400
        if token_record["used_at"]:
            return jsonify({"error": "Token has already been used"}), 400
        if token_record["expires_at"] < get_datetime_now_utc():
            return jsonify({"error": "Token has expired"}), 400
        
        metadata = token_record["metadata"] or {}

        repo = UserRepository(connect)
        user = repo.find_by_id(cursor, token_record["user_id"])

        if not user:
            return jsonify({"error": "User not found"}), 404

        new_email = metadata.get("new_email")
        old_email = user["email"]

        if not new_email:
            return jsonify({"error": "Invalid token metadata"}), 400

        try:
            cursor.execute(
                """
                    UPDATE users
                    SET email = %s, email_verified = TRUE
                    WHERE id = %s
                """, (new_email, token_record["user_id"])
            )
        except psycopg.errors.UniqueViolation:
            connect.rollback()
            return jsonify({"error": "This email is no longer available. Please request the change again."}), 409

        cursor.execute(
            """
                UPDATE email_tokens
                SET used_at = NOW()
                WHERE id = %s
            """, (token_record["id"],)
        )

        if old_email:
            raw_revert_token = secrets.token_urlsafe(32)
            revert_hash = hashlib.sha256(raw_revert_token.encode()).hexdigest()
            revert_expires_at = get_datetime_now_utc() + timedelta(days=14)
            revert_metadata = {"old_email": old_email, "new_email": new_email}

            cursor.execute(
                """
                    INSERT INTO email_tokens (user_id, token_hash, token_type, expires_at, metadata)
                    VALUES (%s, %s, 'email_revert', %s, %s)
                """, (token_record["user_id"], revert_hash, revert_expires_at, json.dumps(revert_metadata))
            )

        connect.commit()

        if old_email:
            revert_url = f"{RESEND_EMAIL_FRONTEND_URL}/revert-email-change?token={raw_revert_token}"
            EmailService.send_email_change_confirmation(
                to_email=old_email,
                new_email=new_email,
                username=user["username"],
                revert_link=revert_url
            )
            EmailService.send_email_added_confirmation(
                to_email=new_email,
                new_email=new_email,
                username=user["username"]
            )

            return jsonify({"message": "Email changed successfully. A confirmation has been sent to the old email address with a link to revert this change if it was not authorized by you."}), 200
        
        EmailService.send_email_added_confirmation(
            to_email=new_email,
            new_email=new_email,
            username=user["username"]
        )
            
        return jsonify({"message": "Email address added successfully"}), 200
    
    except Exception:
        connect.rollback()
        logger.exception("Error confirming email change")
        return jsonify({"error": "Error confirming email change"}), 500
    
    finally:
        cursor.close()

@email_bp.route("/auth/email/revert-email-change", methods=["POST"])
@limiter.limit("3 per hour; 5 per day")
def revert_email_change():
    """Endpoint to revert an email change using the token sent to the old email address."""
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
                SELECT id, user_id, expires_at, used_at, metadata
                FROM email_tokens
                WHERE token_hash = %s AND token_type = 'email_revert'
            """, (token_hash,)
        )
        token_record = cursor.fetchone()

        if not token_record:
            return jsonify({"error": "Invalid token"}), 400
        if token_record["used_at"]:
            return jsonify({"error": "Token has already been used"}), 400
        if token_record["expires_at"] < get_datetime_now_utc():
            return jsonify({"error": "Token has expired"}), 400
        
        metadata = token_record["metadata"] or {}

        repo = UserRepository(connect)
        user = repo.find_by_id(cursor, token_record["user_id"])

        if not user:
            return jsonify({"error": "User not found"}), 404
        
        old_email = metadata.get("old_email")
        new_email = metadata.get("new_email")

        if not old_email or not new_email:
            return jsonify({"error": "Invalid token metadata"}), 400
        
        cursor.execute(
            """
                UPDATE users
                SET email = %s, email_verified = TRUE
                WHERE id = %s
            """, (old_email, token_record["user_id"])
        )

        cursor.execute(
            """
                UPDATE email_tokens
                SET used_at = NOW()
                WHERE id = %s
            """, (token_record["id"],)
        )

        repo.revoke_all_user_refresh_tokens(cursor, token_record["user_id"])

        connect.commit()

        EmailService.send_email_revert_confirmation(
            to_email=old_email,
            username=user["username"]
        )

        return jsonify({"message": "Email change has been reverted. Your email address is now set back to the original email."}), 200
    
    except Exception:
        connect.rollback()
        logger.exception("Error reverting email change")
        return jsonify({"error": "Error reverting email change"}), 500
    
    finally:
        cursor.close()
