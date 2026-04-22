import os
import logging
from flask import Blueprint, request, jsonify, make_response, g
from dotenv import load_dotenv
from services.get_db import get_db
from services.auth_service import AuthService
from repositories.user_repository import UserRepository
from utils.auth_decorators import require_auth
from utils.auth_helpers import (
    detect_user, validate_username, validate_email, validate_password
)
from utils.rate_limiter import limiter

load_dotenv()

logger = logging.getLogger(__name__)

FLASK_ENV = os.getenv("FLASK_ENV", "production").lower()
IS_PRODUCTION = FLASK_ENV != "development"
JWT_REFRESH_EXPIRES_SECONDS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", "2592000"))

auth_bp = Blueprint("auth", __name__)

def _set_refresh_cookie(response, raw_refresh_token: str) -> None:
    response.set_cookie(
        "refresh_token",
        value=raw_refresh_token,
        max_age=JWT_REFRESH_EXPIRES_SECONDS,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="Strict",
        path="/api/auth",
    )

def _clear_refresh_cookie(response) -> None:
    response.set_cookie(
        "refresh_token",
        value="",
        max_age=0,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="Strict",
        path="/api/auth",
    )


# POST /api/auth/register
@auth_bp.route("/auth/register", methods=["POST"])
@limiter.limit("5 per minute; 20 per hour")
def register():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    password = data.get("password", "")
    email = (data.get("email") or "").strip() or None

    err = validate_username(username)
    if err:
        return jsonify({"error": err}), 400
    err = validate_password(password)
    if err:
        return jsonify({"error": err}), 400
    err = validate_email(email)
    if err:
        return jsonify({"error": err}), 400

    connect = get_db()
    cursor = connect.cursor()

    try:
        result = AuthService(connect).register(cursor, username, password, email)
    except ValueError as e:
        connect.rollback()
        msg = str(e)
        if msg == "username_taken":
            return jsonify({"error": "Username is already taken"}), 409
        if msg == "email_taken":
            return jsonify({"error": "Email is already registered"}), 409
        return jsonify({"error": "Registration failed"}), 400

    except Exception:
        connect.rollback()
        logger.exception("Unexpected error during registration")
        return jsonify({"error": "Registration failed"}), 500

    finally:
        cursor.close()

    response = make_response(jsonify({"access_token": result["access_token"], "user": result["user"]}), 201)
    _set_refresh_cookie(response, result["refresh_token"])

    return response

# POST /api/auth/login
@auth_bp.route("/auth/login", methods=["POST"])
@limiter.limit("10 per minute; 60 per hour")
def login():
    data = request.get_json() or {}
    identifier = (data.get("identifier") or "").strip()
    password = data.get("password", "")

    if not identifier:
        return jsonify({"error": "Username or email is required"}), 400
    if not password:
        return jsonify({"error": "Password is required"}), 400

    connect = get_db()
    cursor = connect.cursor()

    try:
        result = AuthService(connect).login(cursor, identifier, password)

    except ValueError as e:
        connect.rollback()

        if str(e) == "invalid_credentials":
            return jsonify({"error": "Invalid username, email or password"}), 401

        return jsonify({"error": "Login failed"}), 400

    except Exception:
        connect.rollback()
        logger.exception("Unexpected error during login")
        return jsonify({"error": "Login failed"}), 500

    finally:
        cursor.close()

    response = make_response(jsonify({"access_token": result["access_token"], "user": result["user"]}), 200)
    _set_refresh_cookie(response, result["refresh_token"])

    return response

# POST /api/auth/logout
@auth_bp.route("/auth/logout", methods=["POST"])
def logout():
    raw_refresh = request.cookies.get("refresh_token")

    if raw_refresh:
        connect = get_db()
        cursor = connect.cursor()

        try:
            AuthService(connect).logout(cursor, raw_refresh)

        except Exception:
            connect.rollback()

        finally:
            cursor.close()

    response = make_response(jsonify({"message": "Logged out"}), 200)
    _clear_refresh_cookie(response)
    return response

# POST /api/auth/refresh
@auth_bp.route("/auth/refresh", methods=["POST"])
@limiter.limit("30 per minute")
def refresh():
    """
    Issues a new access token from the httpOnly refresh cookie.
    Cookie is scoped to Path=/api/auth/refresh and SameSite=Strict,
    so it is never sent cross-site or to other endpoints.
    """
    raw_refresh = request.cookies.get("refresh_token")

    if not raw_refresh:
        return jsonify({"error": "No refresh token provided"}), 401

    connect = get_db()
    cursor = connect.cursor()

    try:
        result = AuthService(connect).refresh_access_token(cursor, raw_refresh)
        response = make_response(jsonify({"access_token": result["access_token"]}), 200)

        if "new_refresh_token" in result:
            _set_refresh_cookie(response, result["new_refresh_token"])

    except ValueError:
        connect.rollback()
        resp = make_response(jsonify({"error": "Session expired. Please log in again."}), 401)
        _clear_refresh_cookie(resp)
        return resp

    except Exception:
        connect.rollback()
        logger.exception("Unexpected error during token refresh")
        resp = make_response(jsonify({"error": "Could not refresh session"}), 500)
        _clear_refresh_cookie(resp)
        return resp

    finally:
        cursor.close()

    return response

# GET /api/auth/me
@auth_bp.route("/auth/me", methods=["GET"])
@require_auth
def me():
    connect = get_db()
    cursor = connect.cursor()

    try:
        repo = UserRepository(connect)
        user_id = g.auth["user_id"]
        user = repo.find_by_id(cursor, user_id)

        if not user:
            return jsonify({"error": "User not found"}), 404

        profile = repo.get_profile(cursor, user_id)

        return jsonify({
            "user_credentials": {
                "user_id": user["id"],
                "username": user.get("username"),
                "email": user.get("email"),
                "is_admin": bool(user.get("is_admin", False)),
                "is_authenticated": bool(user.get("is_authenticated", False))
            },
            "profile": {
                "display_name": profile["display_name"] if profile else None,
                "avatar_url": profile["avatar_url"]   if profile else None,
            }
        }), 200

    except Exception:
        logger.exception("Unexpected error resolving current user")
        return jsonify({"error": "Could not load user"}), 500

    finally:
        cursor.close()


# POST /api/auth/claim - Create an authenticated account
@auth_bp.route("/auth/claim", methods=["POST"])
@limiter.limit("5 per minute; 20 per hour")
def claim():
    """
    Convert an existing anonymous user (UUID in Authorization header)
    into a real account. All history is preserved because users.id
    does not change — only the users row gains auth fields.
    """
    auth = detect_user(request)

    if auth["source"] != "anonymous":
        return jsonify({"error": "Supply your anonymous UUID in the Authorization header"}), 400

    anon_token = auth["token"]
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    password = data.get("password", "")
    email = (data.get("email") or "").strip() or None

    err = validate_username(username)
    if err:
        return jsonify({"error": err}), 400
    err = validate_password(password)
    if err:
        return jsonify({"error": err}), 400
    err = validate_email(email)
    if err:
        return jsonify({"error": err}), 400

    connect = get_db()
    cursor = connect.cursor()

    try:
        result = AuthService(connect).claim_anonymous(cursor, anon_token, username, password, email)

    except ValueError as e:
        connect.rollback()

        error_map = {
            "user_not_found": ("Invalid token", 400),
            "already_claimed": ("This account already has credentials", 409),
            "username_taken": ("Username is already taken", 409),
            "email_taken": ("Email is already registered", 409),
        }
        msg, code = error_map.get(str(e), ("Claim failed", 400))

        return jsonify({"error": msg}), code

    except Exception:
        connect.rollback()
        logger.exception("Unexpected error during account claim")
        return jsonify({"error": "Claim failed"}), 500

    finally:
        cursor.close()

    response = make_response(
        jsonify({
            "access_token": result["access_token"],
            "user": result["user"],
            "message": "Account created successfully",
        }), 200
    )

    _set_refresh_cookie(response, result["refresh_token"])

    return response

# ------------------------------------------------------------------ #
# POST /api/auth/forgot
# ------------------------------------------------------------------ #
@auth_bp.route("/auth/forgot", methods=["POST"])
@limiter.limit("3 per minute; 10 per hour")
def forgot_password():
    """
    Always returns 200 regardless of whether the email is registered.
    This prevents email enumeration. The raw token is logged to console
    in MVP — replace with email dispatch when an email service is integrated.
    """
    data = request.get_json() or {}
    email = (data.get("email") or "").strip()

    err = validate_email(email)
    if err or not email:
        return jsonify({"error": "A valid email is required"}), 400

    connect = get_db()
    cursor = connect.cursor()

    try:
        raw_token = AuthService(connect).initiate_password_reset(cursor, email)
        if raw_token and FLASK_ENV == "development":
            print(f"[DEV] Password reset token for {email}: {raw_token}")

    except Exception:
        connect.rollback()
        logger.exception("Unexpected error initiating password reset")

    finally:
        cursor.close()

    return jsonify({"message": "If that email is registered, a reset link has been sent."}), 200

# POST /api/auth/reset
@auth_bp.route("/auth/reset", methods=["POST"])
@limiter.limit("5 per minute; 20 per hour")
def reset_password():
    data = request.get_json() or {}
    raw_token = data.get("token", "")
    new_password = data.get("password", "")

    if not raw_token:
        return jsonify({"error": "Reset token is required"}), 400

    err = validate_password(new_password)
    if err:
        return jsonify({"error": err}), 400

    connect = get_db()
    cursor = connect.cursor()

    try:
        AuthService(connect).complete_password_reset(cursor, raw_token, new_password)
    except ValueError as e:
        connect.rollback()
        error_map = {
            "invalid_token": ("Invalid or unknown reset token", 400),
            "token_already_used": ("This reset token has already been used", 400),
            "token_expired": ("Reset token has expired", 400),
        }
        msg, code = error_map.get(str(e), ("Password reset failed", 400))
        return jsonify({"error": msg}), code
    except Exception:
        connect.rollback()
        logger.exception("Unexpected error completing password reset")
        return jsonify({"error": "Password reset failed"}), 500
    finally:
        cursor.close()

    return jsonify({"message": "Password reset successful. Please log in with your new password."}), 200
