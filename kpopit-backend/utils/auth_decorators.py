from functools import wraps
from flask import jsonify, g, request
from utils.auth_helpers import detect_user

def optional_auth(f):
    """
    Populates g.auth with the result of detect_user(). No header and an anonymous UUID pass;
    a Bearer token that is expired or invalid gets 401, so the client refreshes and retries
    instead of being treated as anonymous (e.g. an empty Collections album cached until F5).
    Use on game routes to enrich context without requiring login.

    Access via: g.auth["source"], g.auth["user_id"], g.auth["is_authenticated"],
                g.auth["is_admin"], g.auth["token"]
    """
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
