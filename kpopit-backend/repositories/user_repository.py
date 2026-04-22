import hashlib

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
                is_authenticated, is_admin FROM users WHERE LOWER(username) = LOWER(%s)
            """, (username,)
        )
        return cursor.fetchone()

    def find_by_email(self, cursor, email: str) -> dict | None:
        cursor.execute(
            """
                SELECT id, token, username, password_hash, email, email_verified,
                is_authenticated, is_admin FROM users WHERE LOWER(email) = LOWER(%s)
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
            "SELECT id, user_id, display_name, avatar_url, created_at, updated_at "
            "FROM user_profiles WHERE user_id = %s",
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

    # Refresh tokens
    def store_refresh_token(self, cursor, user_id: int, token_hash: str, expires_at) -> None:
        cursor.execute(
            """
                INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
                VALUES (%s, %s, %s)
            """, (user_id, token_hash, expires_at)
        )

    def find_refresh_token(self, cursor, token_hash: str) -> dict | None:
        cursor.execute(
            """
                SELECT id, user_id, expires_at, revoked FROM refresh_tokens
                WHERE token_hash = %s
            """, (token_hash,)
        )
        return cursor.fetchone()

    def revoke_refresh_token(self, cursor, token_hash: str) -> None:
        cursor.execute(
            "UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = %s",
            (token_hash,)
        )

    def revoke_all_user_refresh_tokens(self, cursor, user_id: int) -> None:
        cursor.execute(
            "UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = %s",
            (user_id,)
        )

    # Password reset tokens
    def store_password_reset_token(self, cursor, user_id: int, token_hash: str, expires_at) -> None:
        cursor.execute(
            """
                UPDATE password_reset_tokens SET used = TRUE
                WHERE user_id = %s AND used = FALSE
            """, (user_id,)
        )
        cursor.execute(
            """
                INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) 
                VALUES (%s, %s, %s)
            """, (user_id, token_hash, expires_at)
        )

    def find_password_reset_token(self, cursor, token_hash: str) -> dict | None:
        cursor.execute(
            """
                SELECT id, user_id, expires_at, used FROM password_reset_tokens
                WHERE token_hash = %s
            """, (token_hash,)
        )
        return cursor.fetchone()

    def consume_password_reset_token(self, cursor, token_hash: str) -> None:
        cursor.execute(
            "UPDATE password_reset_tokens SET used = TRUE WHERE token_hash = %s",
            (token_hash,)
        )

    # Utility
    @staticmethod
    def hash_token_for_storage(raw_token: str) -> str:
        """SHA-256 of raw JWT string for DB storage. Never store the raw token."""
        return hashlib.sha256(raw_token.encode()).hexdigest()
