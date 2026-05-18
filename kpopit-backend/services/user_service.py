from flask import request
from datetime import date
from utils.dates import get_today_date_str
from utils.auth_helpers import detect_user

class UserService:
    def __init__(self, db):
        self.db = db

    def handle_user_streak(self, gamemode_id):
        cursor = self.db.cursor()

        auth = detect_user(request)

        if auth["source"] == "none":
            cursor.close()
            return None

        if auth["source"] == "jwt":
            user_id = auth["user_id"]
            
        else:
            cursor.execute(
                "SELECT id FROM users WHERE token = %s", (auth["token"],)
            )
            user_row = cursor.fetchone()
            if not user_row:
                cursor.close()
                return None
            user_id = user_row["id"]

        today = get_today_date_str()

        cursor.execute("""
                SELECT last_played_date FROM user_history
                WHERE user_id = %s AND gamemode_id = %s
            """, (user_id, gamemode_id))

        last_played_row = cursor.fetchone()

        if last_played_row and last_played_row["last_played_date"]:
            last_played_val = last_played_row["last_played_date"]
            last_played_obj = last_played_val if isinstance(last_played_val, date) else date.fromisoformat(last_played_val)
            today_obj = date.fromisoformat(today)

            if (today_obj - last_played_obj).days > 1:
                cursor.execute("""
                        UPDATE user_history
                        SET current_streak = 0
                        WHERE user_id = %s AND gamemode_id = %s
                    """, (user_id, gamemode_id))
                self.db.commit()

        cursor.close()
        return user_id