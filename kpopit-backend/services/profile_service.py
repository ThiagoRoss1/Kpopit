import os
from datetime import date, timedelta
from dotenv import load_dotenv

load_dotenv()

# Off by default: without the flag GET /api/profile/<username> isn't registered at all.
PUBLIC_PROFILE_ENABLED = os.getenv("PUBLIC_PROFILE_ENABLED", "false").lower() == "true"

VISIBILITY_FIELDS = ("is_public", "show_match_history", "show_calendar")
MATCH_HISTORY_LIMIT = 30
CALENDAR_DAYS = 365


class ProfileError(Exception):
    """A settings request the route answers with 400 and this message."""


class ProfileService:
    """Profile fields (bias idol/group), visibility toggles and the public profile of a username.
    Only accounts with credentials have a profile; anonymous users never do."""

    def __init__(self, db):
        self.db = db

    def get_settings(self, cursor, user_id: int) -> dict:
        cursor.execute(
            """
                SELECT bias_idol_id, bias_group_id, is_public, show_match_history, show_calendar
                FROM user_profiles WHERE user_id = %s
            """, (user_id,)
        )
        row = cursor.fetchone()
        return dict(row) if row else {}

    def update_settings(self, cursor, user_id: int, data: dict) -> dict:
        """Apply the given fields (others untouched); raises ProfileError on invalid input."""
        updates = {}
        for field in VISIBILITY_FIELDS:
            if field in data:
                if not isinstance(data[field], bool):
                    raise ProfileError(f"{field} must be true or false")
                updates[field] = data[field]
        for field, table in (("bias_idol_id", "idols"), ("bias_group_id", "groups")):
            if field not in data:
                continue
            value = data[field]
            if value is not None:
                if not isinstance(value, int) or isinstance(value, bool):
                    raise ProfileError(f"{field} must be an id or null")
                cursor.execute(f"SELECT 1 FROM {table} WHERE id = %s AND is_published = TRUE", (value,))
                if not cursor.fetchone():
                    raise ProfileError(f"Unknown {field}")
            updates[field] = value
        if not updates:
            raise ProfileError("No profile settings provided")

        assignments = ", ".join(f"{field} = %s" for field in updates)
        cursor.execute(
            f"""
                UPDATE user_profiles SET {assignments}, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                RETURNING bias_idol_id, bias_group_id, is_public, show_match_history, show_calendar
            """, (*updates.values(), user_id)
        )
        row = cursor.fetchone()
        if not row:
            raise ProfileError("Profile not found")
        return dict(row)

    def find_profile_owner(self, cursor, username: str) -> dict | None:
        cursor.execute(
            """
                SELECT u.id, u.username, u.created_at, p.display_name, p.avatar_url, p.bias_idol_id,
                       p.bias_group_id, p.is_public, p.show_match_history, p.show_calendar
                FROM users u
                JOIN user_profiles p ON p.user_id = u.id
                WHERE LOWER(u.username) = LOWER(%s) AND u.is_authenticated = TRUE
            """, (username,)
        )
        return cursor.fetchone()

    def public_profile(self, cursor, owner: dict, today: date) -> dict:
        """What the owner's visibility allows; a private profile says only that it exists, which
        /auth/check-username already reveals."""
        if not owner["is_public"]:
            return {"username": owner["username"], "is_private": True}

        profile = {
            "username": owner["username"],
            "is_private": False,
            "display_name": owner["display_name"],
            "avatar_url": owner["avatar_url"],
            "member_since": owner["created_at"].date().isoformat() if owner.get("created_at") else None,
            "bias_idol": self._bias_idol(cursor, owner["bias_idol_id"]),
            "bias_group": self._bias_group(cursor, owner["bias_group_id"]),
            "stats": self._stats(cursor, owner["id"]),
            "match_history": None,
            "calendar": None,
        }
        if owner["show_match_history"]:
            profile["match_history"] = self._match_history(cursor, owner["id"], today)
        if owner["show_calendar"]:
            profile["calendar"] = self._calendar(cursor, owner["id"], today)
        return profile

    def _bias_idol(self, cursor, idol_id):
        if idol_id is None:
            return None
        cursor.execute("SELECT id, artist_name, image_path FROM idols WHERE id = %s AND is_published = TRUE", (idol_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    def _bias_group(self, cursor, group_id):
        if group_id is None:
            return None
        cursor.execute("SELECT id, name FROM groups WHERE id = %s AND is_published = TRUE", (group_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    def _stats(self, cursor, user_id: int) -> list[dict]:
        cursor.execute(
            """
                SELECT gamemode_id, current_streak, max_streak, wins_count, average_guesses, one_shot_wins
                FROM user_history WHERE user_id = %s ORDER BY gamemode_id
            """, (user_id,)
        )
        return [{**row, "average_guesses": float(row["average_guesses"] or 0)} for row in cursor.fetchall()]

    def _match_history(self, cursor, user_id: int, today: date) -> list[dict]:
        cursor.execute(
            """
                SELECT date, gamemode_id, won, one_shot_win, guesses_count
                FROM daily_user_history
                WHERE user_id = %s AND date <= %s AND COALESCE(guesses_count, 0) > 0
                ORDER BY date DESC, gamemode_id
                LIMIT %s
            """, (user_id, today, MATCH_HISTORY_LIMIT)
        )
        return [{**row, "date": row["date"].isoformat()} for row in cursor.fetchall()]

    def _calendar(self, cursor, user_id: int, today: date) -> list[dict]:
        """Activity heatmap: games and wins per day over the last year (backfill rows included)."""
        cursor.execute(
            """
                SELECT date, COUNT(*) AS games, COUNT(*) FILTER (WHERE won) AS wins
                FROM daily_user_history
                WHERE user_id = %s AND date <= %s AND date > %s AND COALESCE(guesses_count, 0) > 0
                GROUP BY date ORDER BY date
            """, (user_id, today, today - timedelta(days=CALENDAR_DAYS))
        )
        return [{"date": row["date"].isoformat(), "games": row["games"], "wins": row["wins"]} for row in cursor.fetchall()]
