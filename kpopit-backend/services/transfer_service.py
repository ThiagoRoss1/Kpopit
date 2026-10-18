import logging
import secrets
from datetime import datetime, timedelta
from utils.dates import get_current_timestamp, est_now

logger = logging.getLogger(__name__)


class TransferError(Exception):
    """A request the route answers with 400 and this message."""


class TransferService:
    """One-time codes that move an anonymous token's data to another device."""

    def __init__(self, db):
        self.db = db

    def _require_user(self, cursor, user_token: str) -> None:
        cursor.execute("""
                SELECT id FROM users WHERE token = %s
            """, (user_token,))
        if not cursor.fetchone():
            raise TransferError("Invalid user token")

    def generate_code(self, cursor, user_token: str) -> dict | None:
        """The user's active code, or a new 3-day one; None after 5 failed attempts."""
        current_timestamp = get_current_timestamp()
        self._require_user(cursor, user_token)

        # Committed together with a new code (an existing active code returns before any commit).
        cursor.execute("""
                DELETE FROM transfer_data
                WHERE expires_at < %s
            """, (current_timestamp,))

        for attempt in range(1, 6):
            try:
                cursor.execute("""
                        SELECT code, expires_at FROM transfer_data
                        WHERE user_token = %s AND expires_at >= %s AND used = FALSE
                    """, (user_token, current_timestamp))
                existing_code = cursor.fetchone()
                if existing_code:
                    return {"transfer_code": existing_code["code"], "expires_at": existing_code["expires_at"]}

                code = f"{secrets.token_hex(2)[:3].upper()}-{secrets.token_hex(2)[:3].upper()}"
                expires_at = est_now() + timedelta(days=3)
                cursor.execute("""
                    INSERT INTO transfer_data (user_token, code, created_at, expires_at)
                    VALUES (%s, %s, %s, %s)
                """, (user_token, code, current_timestamp, expires_at.isoformat()))
                self.db.commit()
                return {"transfer_code": code, "expires_at": expires_at.isoformat()}
            except Exception:
                self.db.rollback()
                logger.exception("Transfer code generation attempt %s failed", attempt)
        return None

    def redeem(self, cursor, transfer_code: str) -> str:
        """Marks a valid code used and returns the token it carries; raises TransferError otherwise."""
        cursor.execute("""
                SELECT code, user_token, expires_at, used FROM transfer_data
                WHERE code = %s
            """, (transfer_code,))
        code_row = cursor.fetchone()
        if not code_row:
            raise TransferError("Invalid transfer code")
        if code_row["used"]:
            raise TransferError("Transfer code has already been used")

        expires_at = code_row["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at < est_now():
            raise TransferError("Transfer code has expired")

        cursor.execute("""
                UPDATE transfer_data
                SET used = TRUE
                WHERE code = %s AND used = FALSE
            """, (transfer_code,))
        self.db.commit()
        return code_row["user_token"]

    def get_active_code(self, cursor, user_token: str) -> dict:
        """The user's unused, unexpired code, or nulls."""
        current_timestamp = get_current_timestamp()
        self._require_user(cursor, user_token)

        cursor.execute("""
                SELECT code, expires_at FROM transfer_data
                WHERE user_token = %s AND used = FALSE AND expires_at >= %s
            """, (user_token, current_timestamp))
        result = cursor.fetchone()
        if result:
            return {"transfer_code": result["code"], "expires_at": result["expires_at"]}
        return {"transfer_code": None, "expires_at": None}
