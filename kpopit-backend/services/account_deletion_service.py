import logging
from datetime import timedelta
from repositories.user_repository import UserRepository
from utils.dates import get_today_now

logger = logging.getLogger(__name__)

DELETION_GRACE = timedelta(days=15)


def deletion_clock():
    """The grace period runs on the game-day clock: the real time in production, moved by
    TEST_DATE_OFFSET in development so the 15 days can be walked through locally."""
    return get_today_now()


class AccountDeletionError(Exception):
    """A request the route answers with this message and status."""

    def __init__(self, message: str, status: int):
        super().__init__(message)
        self.status = status


class AccountDeletionService:
    """Deletion with a 15-day grace period: request (password), cancel by logging in, daily purge."""

    def __init__(self, db, auth_service):
        self.db = db
        self.auth_service = auth_service
        self.user_repo = UserRepository(db)

    def request(self, cursor, user_id: int, password: str):
        """Stamp the request and end every session; returns when the account will be deleted."""
        fields = self.user_repo.find_auth_fields_by_id(cursor, user_id)
        if not fields or not fields.get("password_hash"):
            raise AccountDeletionError("Current password is incorrect", 403)
        if not self.auth_service.verify_password(password, fields["password_hash"]):
            raise AccountDeletionError("Current password is incorrect", 403)

        requested_at = deletion_clock()
        cursor.execute("UPDATE users SET deletion_requested_at = %s WHERE id = %s", (requested_at, user_id))
        # Logging in again is the way back, so no session may skip it.
        self.user_repo.revoke_all_user_refresh_tokens(cursor, user_id)
        return requested_at + DELETION_GRACE

    def purge_due(self, cursor) -> int:
        """Delete every account whose grace period is over, with all its game and profile data.
        Profiles, sessions, email tokens and username reservations go with the users row (CASCADE)."""
        cursor.execute(
            "SELECT id, token FROM users WHERE deletion_requested_at <= %s",
            (deletion_clock() - DELETION_GRACE,),
        )
        due = cursor.fetchall()
        for user in due:
            cursor.execute("DELETE FROM transfer_data WHERE user_token = %s", (user["token"],))
            cursor.execute("DELETE FROM user_cards WHERE user_id = %s", (user["id"],))
            cursor.execute("DELETE FROM daily_user_history WHERE user_id = %s", (user["id"],))
            cursor.execute("DELETE FROM user_history WHERE user_id = %s", (user["id"],))
            cursor.execute("DELETE FROM users WHERE id = %s", (user["id"],))
        if due:
            # Internal ids only: never usernames or emails.
            logger.info("Purged %s deleted account(s): %s", len(due), [user["id"] for user in due])
        return len(due)
