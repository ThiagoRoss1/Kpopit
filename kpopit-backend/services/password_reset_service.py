"""Issue reset tokens transactionally; delivery happens after the checkout is released."""

from datetime import timedelta
import hashlib
import secrets

from repositories.user_repository import UserRepository
from utils.dates import utc_now


class PasswordResetService:
    def __init__(self, connect):
        self.connect = connect

    def issue_token(self, cursor, email: str) -> dict | None:
        try:
            user = UserRepository(self.connect).find_by_email(cursor, email)
            if not user:
                self.connect.rollback()
                return None
            raw_token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
            cursor.execute(
                "DELETE FROM email_tokens WHERE user_id = %s AND token_type = 'password_reset' AND used_at IS NULL",
                (user["id"],),
            )
            cursor.execute(
                "INSERT INTO email_tokens (user_id, token_hash, token_type, expires_at) "
                "VALUES (%s, %s, 'password_reset', %s)",
                (user["id"], token_hash, utc_now() + timedelta(hours=1)),
            )
            self.connect.commit()
            return {"email": user["email"], "username": user["username"], "token": raw_token}
        except Exception:
            self.connect.rollback()
            raise
