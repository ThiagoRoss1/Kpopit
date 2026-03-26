from flask import request
from datetime import date
from utils.dates import get_today_date_str

class UserService:
    def __init__(self, db):
        self.db = db
    
    def handle_user_streak(self, gamemode_id):
        cursor = self.db.cursor()

        user_token = request.headers.get("Authorization") or request.args.get("user_token")

        if not user_token:
            cursor.close()
            return None

        cursor.execute("""
                SELECT id FROM users
                WHERE token = %s
            """, (user_token,))

        user_row = cursor.fetchone()

        if user_row:
            user_id = user_row["id"]
            today = get_today_date_str()
            # today = get_server_date()

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
                    # Reset streak
                    cursor.execute("""
                            UPDATE user_history
                            SET current_streak = 0
                            WHERE user_id = %s AND gamemode_id = %s
                        """, (user_id, gamemode_id))
                    self.db.commit()

            cursor.close()
            return user_id
        
        cursor.close()
        return None