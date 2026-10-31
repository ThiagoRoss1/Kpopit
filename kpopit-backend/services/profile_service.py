import os
from datetime import date, timedelta
from utils.env import load_local_env

load_local_env()

# Off by default: without the flag GET /api/profile/<username> isn't registered at all.
PUBLIC_PROFILE_ENABLED = os.getenv("PUBLIC_PROFILE_ENABLED", "false").lower() == "true"

VISIBILITY_FIELDS = ("is_public", "show_match_history", "show_activity")
# One fixed query per bias field: no table name is ever built into SQL.
BIAS_EXISTS_SQL = {
    "bias_idol_id": "SELECT 1 FROM idols WHERE id = %s AND is_published = TRUE",
    "bias_group_id": "SELECT 1 FROM groups WHERE id = %s AND is_published = TRUE",
}
MATCH_HISTORY_LIMIT = 30
ACTIVITY_DAYS = 18 * 7


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
                SELECT bias_idol_id, bias_group_id, is_public, show_match_history, show_activity
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
        for field, exists_sql in BIAS_EXISTS_SQL.items():
            if field not in data:
                continue
            value = data[field]
            if value is not None:
                if not isinstance(value, int) or isinstance(value, bool):
                    raise ProfileError(f"{field} must be an id or null")
                cursor.execute(exists_sql, (value,))
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
                RETURNING bias_idol_id, bias_group_id, is_public, show_match_history, show_activity
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
                       p.bias_group_id, p.is_public, p.show_match_history, p.show_activity
                FROM users u
                JOIN user_profiles p ON p.user_id = u.id
                WHERE LOWER(u.username) = LOWER(%s) AND u.is_authenticated = TRUE
                  AND u.deletion_requested_at IS NULL
            """, (username,)
        )
        return cursor.fetchone()

    def viewer_id(self, cursor, auth: dict, user_token: str | None) -> int | None:
        """Who is looking: the account behind a JWT, else the anonymous player behind X-User-Token."""
        if auth.get("source") == "jwt":
            return auth["user_id"]
        if user_token:
            cursor.execute("SELECT id FROM users WHERE token = %s", (user_token,))
            row = cursor.fetchone()
            return row["id"] if row else None
        return None

    def can_view(self, owner: dict, viewer_id: int | None) -> bool:
        return bool(owner["is_public"]) or owner["id"] == viewer_id

    def public_profile(self, cursor, owner: dict, today: date, viewer_id: int | None, idol_xp: dict | None) -> dict:
        """What the owner's visibility allows the viewer to see. A private profile says only that it
        exists (which /auth/check-username already reveals); the owner always sees everything."""
        is_owner = owner["id"] == viewer_id
        if not self.can_view(owner, viewer_id):
            return {"username": owner["username"], "is_private": True}
        show_activity = is_owner or bool(owner["show_activity"])
        return {
            "username": owner["username"],
            "is_private": False,
            "is_owner": is_owner,
            "today": today.isoformat(),
            "display_name": owner["display_name"],
            "avatar_url": owner["avatar_url"],
            "member_since": owner["created_at"].date().isoformat() if owner.get("created_at") else None,
            "bias_idol": self._bias_idol(cursor, owner["bias_idol_id"]),
            "bias_group": self._bias_group(cursor, owner["bias_group_id"]),
            "history_visible": is_owner or bool(owner["show_match_history"]),
            "activity": self._activity(cursor, owner["id"], today) if show_activity else None,
            "idol_xp": idol_xp,
        }

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

    def _activity(self, cursor, user_id: int, today: date) -> list[dict]:
        """Heatmap of the last ACTIVITY_DAYS days: how many modes were played each day (0-3)."""
        cursor.execute(
            """
                SELECT date, COUNT(DISTINCT gamemode_id) AS modes
                FROM daily_user_history
                WHERE user_id = %s AND date <= %s AND date > %s AND COALESCE(guesses_count, 0) > 0
                GROUP BY date ORDER BY date
            """, (user_id, today, today - timedelta(days=ACTIVITY_DAYS))
        )
        return [{"date": row["date"].isoformat(), "modes": row["modes"]} for row in cursor.fetchall()]

    def history(self, cursor, owner_id: int, viewer_id: int | None, today: date, mode: int | None,
                offset: int) -> dict:
        """The owner's games, newest first. An entry carries its answer only when the viewer finished
        that same day and mode (the owner included); otherwise it is locked: date, mode and Day N, and
        nothing about the answer is sent."""
        cursor.execute(
            """
                SELECT h.date, h.gamemode_id, h.won, h.guesses_count, h.is_calendar,
                       (v.id IS NOT NULL) AS viewer_finished,
                       CASE WHEN h.date >= first.first_day THEN h.date - first.first_day + 1 END AS day_number,
                       COALESCE(al.name, i.artist_name) AS answer_name,
                       COALESCE(al.cover_path, i.image_path) AS answer_image
                FROM daily_user_history h
                LEFT JOIN daily_user_history v
                    ON v.user_id = %(viewer)s AND v.date = h.date AND v.gamemode_id = h.gamemode_id AND v.won = TRUE
                LEFT JOIN (SELECT gamemode_id, MIN(pick_date) AS first_day FROM daily_picks GROUP BY gamemode_id) first
                    ON first.gamemode_id = h.gamemode_id
                LEFT JOIN daily_picks dp ON dp.pick_date = h.date AND dp.gamemode_id = h.gamemode_id
                LEFT JOIN idols i ON i.id = dp.idol_id
                LEFT JOIN albums al ON al.id = dp.album_id
                WHERE h.user_id = %(owner)s AND h.date <= %(today)s AND COALESCE(h.guesses_count, 0) > 0
                  AND (%(mode)s::int IS NULL OR h.gamemode_id = %(mode)s::int)
                ORDER BY h.date DESC, h.gamemode_id
                LIMIT %(limit)s OFFSET %(offset)s
            """, {"viewer": viewer_id, "owner": owner_id, "today": today, "mode": mode,
                  "limit": MATCH_HISTORY_LIMIT + 1, "offset": offset},
        )
        rows = cursor.fetchall()
        entries = []
        for row in rows[:MATCH_HISTORY_LIMIT]:
            entry = {"date": row["date"].isoformat(), "gamemode_id": row["gamemode_id"], "day_number": row["day_number"]}
            if row["viewer_finished"]:
                entry.update(locked=False, won=row["won"], guesses=row["guesses_count"], is_calendar=row["is_calendar"],
                             answer={"name": row["answer_name"], "image_path": row["answer_image"]})
            elif owner_id == viewer_id:
                # The owner's own unfinished day: the game, but not the answer they haven't found yet.
                entry.update(locked=False, won=False, guesses=row["guesses_count"], is_calendar=row["is_calendar"],
                             answer=None)
            else:
                entry["locked"] = True
            entries.append(entry)
        return {"entries": entries, "has_more": len(rows) > MATCH_HISTORY_LIMIT}
