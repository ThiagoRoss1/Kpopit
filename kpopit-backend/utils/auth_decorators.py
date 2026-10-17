from functools import wraps
from flask import jsonify, g, request
from utils.auth_helpers import detect_user

def optional_auth(f):
    """Populate g.auth from detect_user(); no header and anonymous UUIDs pass.
    An expired/invalid Bearer token gets 401 so the client refreshes instead of being served
    anonymous data (e.g. an empty Collections album cached until F5)."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = detect_user(request)
        if auth["source"] == "invalid":
            return jsonify({"error": "Invalid or expired token"}), 401
        g.auth = auth
        return f(*args, **kwargs)
    return wrapper

def require_auth(f):
    """
    Requires a valid JWT access token in the Authorization header.
    Returns 401 if missing or invalid. Populates g.auth on success.
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = detect_user(request)
        if auth["source"] != "jwt":
            return jsonify({"error": "Authentication required"}), 401
        g.auth = auth
        return f(*args, **kwargs)
    return wrapper

def require_admin(f):
    """
    Requires a valid JWT access token with is_admin=True.
    Returns 401 if not authenticated, 403 if authenticated but not admin.
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = detect_user(request)
        if auth["source"] != "jwt":
            return jsonify({"error": "Authentication required"}), 401
        if not auth.get("is_admin"):
            return jsonify({"error": "Admin access required"}), 403
        g.auth = auth
        return f(*args, **kwargs)
    return wrapper
