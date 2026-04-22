import os
import re
import jwt
from dotenv import load_dotenv
from email_validator import validate_email as validate_email_format, EmailNotValidError

load_dotenv()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY or len(JWT_SECRET_KEY) < 32:
    raise RuntimeError("JWT_SECRET_KEY must be set and at least 32 characters long.")

_UUID_REGEX = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    re.IGNORECASE
)

def _is_uuid(value: str) -> bool:
    return bool(_UUID_REGEX.match(value))

def decode_jwt(token: str, expected_type: str) -> dict | None:
    """
    Decode and validate a JWT.
    Pins algorithm to HS256 only — prevents alg=none and RS256 confusion attacks.
    Validates the 'type' claim to prevent token substitution (access vs refresh).
    Returns the payload dict on success, None on any failure.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") != expected_type:
            return None
        
        return payload
    
    except jwt.ExpiredSignatureError:
        return None
    
    except jwt.InvalidTokenError:
        return None
    
def detect_user(req) -> dict:
    """
    Parse the Authorization header and return a standardized identity dict.

    Returns one of:
      {"source": "jwt", "user_id": int, "token": str, "username": str,
       "is_admin": bool, "is_authenticated": True, "payload": dict}
      {"source": "anonymous", "user_id": None, "token": str,
       "is_admin": False, "is_authenticated": False}
      {"source": "none",      "user_id": None, "token": None,
       "is_admin": False, "is_authenticated": False}

    Does NOT touch the database. Callers needing user_id for anonymous users
    must resolve it from the DB using the returned token.
    """
    auth_header = req.headers.get("Authorization", "").strip()

    if not auth_header:
        return _no_auth()

    if auth_header.startswith("Bearer "):
        raw_token = auth_header[7:]

        payload = decode_jwt(raw_token, expected_type="access")

        if payload is None:
            return _no_auth()
        
        return {
            "source": "jwt",
            "user_id": payload.get("user_id"),
            "username": payload.get("username"),
            "is_admin": bool(payload.get("is_admin", False)),
            "is_authenticated": True,
            "payload": payload,
        }
            # "token": payload.get("sub"), - We don't need UUID token for authenticated users.

    if _is_uuid(auth_header):
        return {
            "source": "anonymous",
            "user_id": None,
            "token": auth_header,
            "is_admin": False,
            "is_authenticated": False,
        }

    return _no_auth()

def _no_auth() -> dict:
    return {
        "source": "none",
        "user_id": None,
        "token": None,
        "is_admin": False,
        "is_authenticated": False,
    }

def validate_username(username: str) -> str | None:
    """Returns None if valid, error string otherwise."""
    if not username or not isinstance(username, str):
        return "Username is required."
    
    if len(username) < 3:
        return "Username must be at least 3 characters."
    
    if len(username) > 30:
        return "Username must be at most 30 characters."
    
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        return "Username may only contain letters, numbers, underscores, and hyphens."
    return None

def validate_email(email: str) -> str | None:
    """Basic format check. Returns None if valid or empty (email is optional)."""
    if not email:
        return None
    
    try:
        validate_email_format(email, check_deliverability=False)
        return None
    
    except EmailNotValidError:
        return "Invalid email format."
    
def validate_password(password: str) -> str | None:
    """Returns None if valid, error string otherwise."""
    if not password or len(password) < 8:
        return "Password must be at least 8 characters."
    # bcrypt runs a cost-12 hash on the input; cap length so an unauthenticated
    # attacker cannot trigger multi-second hashes via giant password payloads.
    if len(password) > 128:
        return "Password must be at most 128 characters."
    return None
