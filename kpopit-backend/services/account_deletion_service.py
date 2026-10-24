import logging
from datetime import timedelta
from repositories.user_repository import UserRepository
from utils.dates import get_today_now
from utils.r2 import R2Client

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
            """
                SELECT u.id, u.token, p.avatar_url FROM users u
                LEFT JOIN user_profiles p ON p.user_id = u.id
                WHERE u.deletion_requested_at <= %s
            """,
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
            self._delete_avatar_files(due)
        return len(due)

    def _delete_avatar_files(self, users) -> None:
        """Best effort: the account data must go even if the bucket is unreachable; leftovers are logged."""
        if not R2Client.avatars_configured():
            logger.info("Avatar bucket not configured: skipped avatar deletion for %s account(s)", len(users))
            return
        keys = [key for user in users for key in R2Client.avatar_keys(user["id"], user["avatar_url"])]
        try:
            R2Client().delete_files(keys)
        except Exception as error:
            logger.error("Could not delete avatar files of purged accounts %s (%s)",
                         [user["id"] for user in users], type(error).__name__)
