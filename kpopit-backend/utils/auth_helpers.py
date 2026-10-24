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

# Header for the routes keyed by the anonymous token itself (stats, rank, game state, transfer):
# the token stays out of URLs and access logs, and a logged-in Bearer header can't replace it.
USER_TOKEN_HEADER = "X-User-Token"


def user_token_from_header(req, path_token: str | None = None) -> str | None:
    """The X-User-Token value, else the legacy /<user_token> path segment; None when both are blank.
    The path form stays for one release (deploy window, long-open tabs); the header wins."""
    return (req.headers.get(USER_TOKEN_HEADER) or "").strip() or (path_token or "").strip() or None


def _is_uuid(value: str) -> bool:
    return bool(_UUID_REGEX.match(value))

def decode_jwt(token: str, expected_type: str) -> dict | None:
    """Decode a JWT; returns the payload, or None on any failure.
    Pins HS256 (no alg=none / RS256 confusion) and checks the 'type' claim (access vs refresh)."""
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
    """Classify the Authorization header without touching the database. `source` is "jwt" (with
    user_id, username, is_admin, payload), "anonymous" (bare UUID in `token`; callers resolve the
    user_id), "none" (no header) or "invalid" (anything else, e.g. an expired/forged Bearer token).
    Every result also carries is_admin and is_authenticated."""
    auth_header = req.headers.get("Authorization", "").strip()

    if not auth_header:
        return _no_auth()

    parts = auth_header.split(maxsplit=1)
    if parts and parts[0].lower() == "bearer":
        raw_token = parts[1] if len(parts) == 2 else ""

        payload = decode_jwt(raw_token, expected_type="access")

        if payload is None:
            # A token was sent but is expired/forged: not the same as no auth. Callers answer 401
            # so the client refreshes instead of being served (and caching) anonymous data.
            return {**_no_auth(), "source": "invalid"}
        
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

    return {**_no_auth(), "source": "invalid"}

def _no_auth() -> dict:
    return {
        "source": "none",
        "user_id": None,
        "token": None,
        "is_admin": False,
        "is_authenticated": False,
    }

def validate_display_name(display_name: str) -> str | None:
    """Returns None if valid, error string otherwise."""
    if not display_name or not isinstance(display_name, str):
        return "Display name is required."
    
    if len(display_name) > 30:
        return "Display name must be at most 30 characters."
    return None

def validate_username(username: str) -> str | None:
    """Returns None if valid, error string otherwise."""
    if not username or not isinstance(username, str):
        return "Username is required."
    
    if len(username) < 3:
        return "Username must be at least 3 characters."
    
    if len(username) > 12:
        return "Username must be at most 12 characters."
    
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        return "Username may only contain letters, numbers, underscores, and hyphens."
    return None

def validate_and_normalize_email(email: str) -> str | None:
    """Returns normalized email if valid, None if invalid or empty."""
    if not email:
        return None
    
    try:
        result = validate_email_format(email, check_deliverability=False)
        return result.normalized
    
    except EmailNotValidError:
        return None
    
def validate_password(password: str) -> str | None:
    """Returns None if valid, error string otherwise."""
    if not password or len(password) < 8:
        return "Password must be at least 8 characters."
    # bcrypt runs a cost-12 hash on the input; cap length so an unauthenticated
    # attacker cannot trigger multi-second hashes via giant password payloads.
    if len(password) > 128:
        return "Password must be at most 128 characters."
    return None
