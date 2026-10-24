import hashlib
from utils.dates import utc_now

class UserRepository:
    def __init__(self, db):
        self.db = db

    # Lookups
    def find_by_token(self, cursor, token: str) -> dict | None:
        cursor.execute(
            """
                SELECT id, token, username, email, email_verified, is_authenticated,
                is_admin, last_login_at, created_at FROM users WHERE token = %s
            """, (token,)
        )
        return cursor.fetchone()

    def find_by_username(self, cursor, username: str) -> dict | None:
        cursor.execute(
            """
                SELECT id, token, username, password_hash, email, email_verified,
                is_authenticated, is_admin, deletion_requested_at FROM users WHERE LOWER(username) = LOWER(%s)
            """, (username,)
        )
        return cursor.fetchone()

    def find_by_email(self, cursor, email: str) -> dict | None:
        cursor.execute(
            """
                SELECT id, token, username, password_hash, email, email_verified,
                is_authenticated, is_admin, deletion_requested_at FROM users WHERE LOWER(email) = LOWER(%s)
            """, (email,)
        )
        return cursor.fetchone()

    def find_by_id(self, cursor, user_id: int) -> dict | None:
        cursor.execute(
            """
                SELECT id, token, username, email, email_verified, is_authenticated,
                is_admin, last_login_at, created_at FROM users WHERE id = %s
            """, (user_id,)
        )
        return cursor.fetchone()

    def find_auth_fields_by_id(self, cursor, user_id: int) -> dict | None:
        """Returns password_hash + username_changed_at for a logged-in user.
        Kept separate from find_by_id so that endpoint shapes don't accidentally
        leak the password hash."""
        cursor.execute(
            """
                SELECT password_hash, username_changed_at
                FROM users WHERE id = %s
            """, (user_id,)
        )
        return cursor.fetchone()
    
    def check_username_exists(self, cursor, username: str, exclude_user_id: int | None = None) -> bool:
        """True when the name belongs to an account or is reserved after a rename. The excluded
        user may take back a name only they hold (their own current or reserved one)."""
        cursor.execute(
            """
                SELECT 1 FROM users WHERE LOWER(username) = LOWER(%s) AND id IS DISTINCT FROM %s
                UNION ALL
                SELECT 1 FROM username_reservations
                WHERE LOWER(username) = LOWER(%s) AND reserved_until > %s AND user_id IS DISTINCT FROM %s
            """, (username, exclude_user_id, username, utc_now(), exclude_user_id)
        )
        return cursor.fetchone() is not None

    # Username reservations
    def reserve_username(self, cursor, user_id: int, username: str, reserved_until) -> None:
        cursor.execute(
            """
                INSERT INTO username_reservations (username, user_id, reserved_until)
                VALUES (%s, %s, %s)
            """, (username, user_id, reserved_until)
        )

    def release_own_reservation(self, cursor, user_id: int, username: str) -> None:
        """A user taking back a name they reserved ends that reservation."""
        cursor.execute(
            "DELETE FROM username_reservations WHERE user_id = %s AND LOWER(username) = LOWER(%s)",
            (user_id, username)
        )

    def find_reservation_owner(self, cursor, username: str) -> dict | None:
        """The account an active reservation points to (its current username), or None."""
        cursor.execute(
            """
                SELECT u.id, u.username FROM username_reservations r
                JOIN users u ON u.id = r.user_id
                WHERE LOWER(r.username) = LOWER(%s) AND r.reserved_until > %s
                  AND u.is_authenticated = TRUE AND u.username IS NOT NULL
                ORDER BY r.reserved_until DESC
                LIMIT 1
            """, (username, utc_now())
        )
        return cursor.fetchone()

    # Mutations
    def upgrade_to_authenticated(self, cursor, token: str, username: str, password_hash: str, email: str | None) -> dict | None:
        cursor.execute(
            """
                UPDATE users
                SET username = %s, password_hash = %s, email = %s,
                    is_authenticated = TRUE, last_login_at = CURRENT_TIMESTAMP
                WHERE token = %s
                RETURNING id, token, username, email, is_authenticated, is_admin
            """,
            (username, password_hash, email, token)
        )
        return cursor.fetchone()

    def create_with_credentials(self, cursor, token: str, username: str, password_hash: str, email: str | None) -> dict:
        cursor.execute(
            """
                INSERT INTO users (token, username, password_hash, email, is_authenticated)
                VALUES (%s, %s, %s, %s, TRUE)
                RETURNING id, token, username, email, is_authenticated, is_admin
            """,
            (token, username, password_hash, email)
        )
        return cursor.fetchone()

    def cancel_deletion(self, cursor, user_id: int) -> None:
        cursor.execute("UPDATE users SET deletion_requested_at = NULL WHERE id = %s", (user_id,))

    def update_last_login(self, cursor, user_id: int) -> None:
        cursor.execute(
            "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = %s",
            (user_id,)
        )

    def update_password_hash(self, cursor, user_id: int, new_hash: str) -> None:
        cursor.execute(
            "UPDATE users SET password_hash = %s WHERE id = %s",
            (new_hash, user_id)
        )

    # Profile
    def get_profile(self, cursor, user_id: int) -> dict | None:
        cursor.execute(
            "SELECT id, user_id, display_name, avatar_url, created_at, updated_at, bias_idol_id, bias_group_id, "
            "is_public, show_match_history, show_calendar FROM user_profiles WHERE user_id = %s",
            (user_id,)
        )
        return cursor.fetchone()

    def upsert_profile(self, cursor, user_id: int, display_name: str | None, avatar_url: str | None) -> dict:
        cursor.execute(
            """
            INSERT INTO user_profiles (user_id, display_name, avatar_url)
            VALUES (%s, %s, %s)
            ON CONFLICT (user_id) DO UPDATE
                SET display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
                    avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
                    updated_at = CURRENT_TIMESTAMP
            RETURNING id, user_id, display_name, avatar_url, updated_at
            """,
            (user_id, display_name, avatar_url)
        )
        return cursor.fetchone()
    
    def get_random_avatar(self, cursor) -> str:
        cursor.execute(
            """
                SELECT image_path FROM idols
                WHERE image_path IS NOT NULL
                AND is_published = TRUE
                ORDER BY RANDOM()
                LIMIT 1
            """
        )
        result = cursor.fetchone()
        return result["image_path"] if result else None
        

    # Refresh tokens
    def store_refresh_token(self, cursor, user_id: int, token_hash: str, expires_at, remember_me: bool) -> int | None:
        """Store a refresh session and return its id (the access token's `sid`)."""
        cursor.execute(
            """
                INSERT INTO refresh_tokens (user_id, token_hash, expires_at, remember_me)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (token_hash) DO NOTHING
                RETURNING id
            """, (user_id, token_hash, expires_at, remember_me)
        )
        row = cursor.fetchone()
        return row["id"] if row else None

    def find_refresh_token(self, cursor, token_hash: str) -> dict | None:
        cursor.execute(
            """
                SELECT id, user_id, expires_at, revoked, remember_me FROM refresh_tokens
                WHERE token_hash = %s
            """, (token_hash,)
        )
        return cursor.fetchone()

    def revoke_refresh_token(self, cursor, token_hash: str) -> None:
        cursor.execute(
            "UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = %s",
            (token_hash,)
        )

    def revoke_other_refresh_tokens(self, cursor, user_id: int, keep_id: int | None) -> None:
        """Revoke every refresh session of the user except `keep_id` (all of them when it is None)."""
        cursor.execute(
            "UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = %s AND revoked = FALSE AND id IS DISTINCT FROM %s",
            (user_id, keep_id)
        )

    def revoke_all_user_refresh_tokens(self, cursor, user_id: int) -> None:
        cursor.execute(
            "UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = %s",
            (user_id,)
        )

    # Profile changes
    def update_display_name(self, cursor, user_id: int, display_name: str) -> dict:
        cursor.execute(
            """
                UPDATE user_profiles
                SET display_name = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                RETURNING display_name, updated_at
            """, (display_name, user_id)
        )
        return cursor.fetchone()
    
    def update_username(self, cursor, user_id: int, username: str) -> dict:
        cursor.execute(
            """
                UPDATE users
                SET username = %s,
                    username_changed_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING username, username_changed_at
            """, (username, user_id)
        )
        return cursor.fetchone()

    def update_avatar(self, cursor, user_id: int, avatar_url: str) -> dict:
        cursor.execute(
            """
                UPDATE user_profiles
                SET avatar_url = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                RETURNING avatar_url, updated_at
            """, (avatar_url, user_id)
        )
        return cursor.fetchone()
    
    # Utility
    @staticmethod
    def hash_token_for_storage(raw_token: str) -> str:
        """SHA-256 of raw JWT string for DB storage. Never store the raw token."""
        return hashlib.sha256(raw_token.encode()).hexdigest()
