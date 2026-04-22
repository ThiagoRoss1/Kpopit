import os
import uuid
import secrets
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from dotenv import load_dotenv
from repositories.user_repository import UserRepository

load_dotenv()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ACCESS_EXPIRES_SECONDS  = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES",  "3600"))
JWT_REFRESH_EXPIRES_SECONDS = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", "2592000"))

# Pre-computed at module load to prevent timing-based user enumeration.
# Any login for a non-existent user runs checkpw against this, making
# the response time indistinguishable from a valid-user-wrong-password case.
_DUMMY_HASH = bcrypt.hashpw(b"dummy_timing_guard", bcrypt.gensalt(rounds=12))

class AuthService:
    def __init__(self, db):
        self.db = db
        self.user_repo = UserRepository(db)

    # Password helpers
    def hash_password(self, password: str) -> str:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()

    def verify_password(self, plain: str, hashed: str) -> bool:
        return bcrypt.checkpw(plain.encode(), hashed.encode())

    def _dummy_password_check(self) -> None:
        bcrypt.checkpw(b"irrelevant", _DUMMY_HASH)

    # JWT helpers
    def generate_access_token(self, user: dict) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": user["token"],
            "user_id": user["id"],
            "username": user.get("username"),
            "is_admin": bool(user.get("is_admin", False)),
            "is_authenticated": True,
            "type": "access",
            "iat": now,
            "exp": now + timedelta(seconds=JWT_ACCESS_EXPIRES_SECONDS),
        }
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")

    def generate_refresh_token(self, user: dict) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub":  user["token"],
            "type": "refresh",
            "iat":  now,
            "exp":  now + timedelta(seconds=JWT_REFRESH_EXPIRES_SECONDS),
        }
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")

    def _store_refresh_token(self, cursor, user_id: int, raw_refresh: str) -> None:
        token_hash = UserRepository.hash_token_for_storage(raw_refresh)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=JWT_REFRESH_EXPIRES_SECONDS)
        self.user_repo.store_refresh_token(cursor, user_id, token_hash, expires_at)

    def _build_token_pair(self, cursor, user: dict) -> dict:
        access = self.generate_access_token(user)
        refresh = self.generate_refresh_token(user)
        self._store_refresh_token(cursor, user["id"], refresh)

        return {"access_token": access, "refresh_token": refresh}

    # Register
    def register(self, cursor, username: str, password: str, email: str | None) -> dict:
        if self.user_repo.find_by_username(cursor, username):
            raise ValueError("username_taken")
        
        if email and self.user_repo.find_by_email(cursor, email):
            raise ValueError("email_taken")

        token = str(uuid.uuid4())
        password_hash = self.hash_password(password)
        user = self.user_repo.create_with_credentials(cursor, token, username, password_hash, email)
        self.db.commit()

        tokens = self._build_token_pair(cursor, user)
        self.db.commit()

        return {
            **tokens,
            "user": {
                "user_id": user["id"],
                "username": user["username"],
                "email": user.get("email"),
                "is_admin": bool(user.get("is_admin", False)),
                "is_authenticated": True,
            }
        }

    # Login
    def login(self, cursor, identifier: str, password: str) -> dict:
        if "@" in identifier:
            user = self.user_repo.find_by_email(cursor, identifier)
        else:
            user = self.user_repo.find_by_username(cursor, identifier)

        if not user:
            self._dummy_password_check()
            raise ValueError("invalid_credentials")

        if not user.get("password_hash"):
            self._dummy_password_check()
            raise ValueError("invalid_credentials")

        if not self.verify_password(password, user["password_hash"]):
            raise ValueError("invalid_credentials")

        self.user_repo.update_last_login(cursor, user["id"])
        tokens = self._build_token_pair(cursor, user)
        self.db.commit()

        return {
            **tokens,
            "user": {
                "user_id": user["id"],
                "username": user["username"],
                "email": user.get("email"),
                "is_admin": bool(user.get("is_admin", False)),
                "is_authenticated": True,
            }
        }

    # Claim (anonymous → authenticated)
    def claim_anonymous(self, cursor, anon_token: str, username: str, password: str, email: str | None) -> dict:
        user = self.user_repo.find_by_token(cursor, anon_token)
        if not user:
            raise ValueError("user_not_found")
        
        if user.get("is_authenticated"):
            raise ValueError("already_claimed")

        conflict = self.user_repo.find_by_username(cursor, username)
        if conflict and conflict["id"] != user["id"]:
            raise ValueError("username_taken")
        
        if email:
            conflict = self.user_repo.find_by_email(cursor, email)

            if conflict and conflict["id"] != user["id"]:
                raise ValueError("email_taken")

        password_hash = self.hash_password(password)
        updated_user = self.user_repo.upgrade_to_authenticated(cursor, anon_token, username, password_hash, email)
        tokens = self._build_token_pair(cursor, updated_user)
        self.db.commit()

        return {
            **tokens,
            "user": {
                "user_id": updated_user["id"],
                "username": updated_user["username"],
                "email": updated_user.get("email"),
                "is_admin": bool(updated_user.get("is_admin", False)),
                "is_authenticated": True,
            }
        }

    # Refresh
    def refresh_access_token(self, cursor, raw_refresh_token: str) -> dict:
        from utils.auth_helpers import decode_jwt

        payload = decode_jwt(raw_refresh_token, expected_type="refresh")
        if not payload:
            raise ValueError("invalid_refresh_token")

        token_hash = UserRepository.hash_token_for_storage(raw_refresh_token)
        db_record  = self.user_repo.find_refresh_token(cursor, token_hash)

        if not db_record:
            raise ValueError("invalid_refresh_token")
        
        if db_record["revoked"]:
            raise ValueError("token_revoked")

        now = datetime.now(timezone.utc)
        exp = db_record["expires_at"]

        if hasattr(exp, "tzinfo") and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)

        if now > exp:
            raise ValueError("token_expired")

        user = self.user_repo.find_by_id(cursor, db_record["user_id"])
        if not user:
            raise ValueError("user_not_found")
        
        self.user_repo.revoke_refresh_token(cursor, token_hash)

        new_raw_refresh = self.generate_refresh_token(user)
        new_hash = UserRepository.hash_token_for_storage(new_raw_refresh)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=JWT_REFRESH_EXPIRES_SECONDS)
        self.user_repo.store_refresh_token(cursor, user["id"], new_hash, expires_at)

        self.db.commit()

        return {
            "access_token": self.generate_access_token(user),
            "new_refresh_token": new_raw_refresh
        }

    # Logout
    def logout(self, cursor, raw_refresh_token: str) -> None:
        token_hash = UserRepository.hash_token_for_storage(raw_refresh_token)
        self.user_repo.revoke_refresh_token(cursor, token_hash)
        self.db.commit()

    # Password reset
    def initiate_password_reset(self, cursor, email: str) -> str | None:
        user = self.user_repo.find_by_email(cursor, email)
        if not user:
            return None

        raw_token  = secrets.token_urlsafe(32)
        token_hash = UserRepository.hash_token_for_storage(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

        self.user_repo.store_password_reset_token(cursor, user["id"], token_hash, expires_at)
        self.db.commit()

        return raw_token

    def complete_password_reset(self, cursor, raw_token: str, new_password: str) -> None:
        token_hash = UserRepository.hash_token_for_storage(raw_token)
        record = self.user_repo.find_password_reset_token(cursor, token_hash)

        if not record:
            raise ValueError("invalid_token")
        
        if record["used"]:
            raise ValueError("token_already_used")

        now = datetime.now(timezone.utc)
        exp = record["expires_at"]

        if hasattr(exp, "tzinfo") and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)

        if now > exp:
            raise ValueError("token_expired")

        new_hash = self.hash_password(new_password)
        self.user_repo.update_password_hash(cursor, record["user_id"], new_hash)
        self.user_repo.consume_password_reset_token(cursor, token_hash)
        self.user_repo.revoke_all_user_refresh_tokens(cursor, record["user_id"])
        self.db.commit()
