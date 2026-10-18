from datetime import timedelta
from repositories.idol_repository import CURRENT_CAREER_CTE
from utils.dates import get_today_date


class YesterdayService:
    """Yesterday's answer per gamemode: recorded in yesterday_picks, then returned for display."""

    def __init__(self, db):
        self.db = db

    def store_yesterdays_idol(self, cursor, gamemode_id: int) -> dict | None:
        """Classic/Blurry: yesterday's idol with name, current group and image; None on the first day."""
        yesterday_str = (get_today_date() - timedelta(days=1)).isoformat()

        cursor.execute("""
            SELECT idol_id FROM daily_picks WHERE pick_date = %s AND gamemode_id = %s
        """, (yesterday_str, gamemode_id,))
        result = cursor.fetchone()
        if not (result and result["idol_id"]):
            return None

        cursor.execute("""
            INSERT INTO yesterday_picks (past_idol_id, yesterdays_pick_date, gamemode_id)
            VALUES (%s, %s, %s)
            ON CONFLICT(yesterdays_pick_date, gamemode_id)
            DO UPDATE SET past_idol_id = excluded.past_idol_id
        """, (result["idol_id"], yesterday_str, gamemode_id))
        self.db.commit()

        cursor.execute("""
            SELECT artist_name FROM idols WHERE id = %s
        """, (result["idol_id"],))
        artist_name = cursor.fetchone()["artist_name"]

        cursor.execute(f"""
            WITH {CURRENT_CAREER_CTE}
            SELECT g.name FROM groups AS g
            JOIN current_career AS cc ON g.id = cc.group_id
            WHERE cc.idol_id = %s
            ORDER BY g.id ASC
        """, (result["idol_id"],))
        group_result = cursor.fetchone()

        cursor.execute("""
            SELECT image_path, image_version FROM idols WHERE id = %s
        """, (result["idol_id"],))
        image_result = cursor.fetchone()
        image_path = image_result["image_path"] if image_result else None
        image_version = image_result["image_version"] if image_result else "1"

        return {
            "past_idol_id": result["idol_id"],
            "yesterdays_pick_date": yesterday_str,
            "artist_name": artist_name,
            "groups": [group_result["name"]] if group_result else [],
            "image_path": image_path,
            "image_version": image_version
        }

    def store_yesterdays_album(self, cursor, gamemode_id: int) -> dict | None:
        """Pixelated: yesterday's album with cover and artist; None on the first day."""
        yesterday_str = (get_today_date() - timedelta(days=1)).isoformat()

        cursor.execute("""
            SELECT album_id FROM daily_picks WHERE pick_date = %s AND gamemode_id = %s
        """, (yesterday_str, gamemode_id,))
        result = cursor.fetchone()
        if not (result and result["album_id"]):
            return None

        cursor.execute("""
            INSERT INTO yesterday_picks (past_album_id, yesterdays_pick_date, gamemode_id)
            VALUES (%s, %s, %s)
            ON CONFLICT(yesterdays_pick_date, gamemode_id)
            DO UPDATE SET past_album_id = excluded.past_album_id
        """, (result["album_id"], yesterday_str, gamemode_id))
        self.db.commit()

        cursor.execute("""
            SELECT a.name AS album_name, a.cover_path, g.name AS group_name, i.artist_name
            FROM albums AS a
            LEFT JOIN groups AS g ON a.group_id = g.id
            LEFT JOIN idols AS i ON a.soloist_id = i.id
            WHERE a.id = %s
        """, (result["album_id"],))
        album_result = cursor.fetchone()
        album_name = album_result["album_name"] if album_result else None
        cover_path = album_result["cover_path"] if album_result else None
        artist = album_result["group_name"] if album_result and album_result["group_name"] else album_result["artist_name"] if album_result else None

        return {
            "past_album_id": result["album_id"],
            "yesterdays_pick_date": yesterday_str,
            "album_name": album_name,
            "cover_path": cover_path,
            "artist": artist
        }
