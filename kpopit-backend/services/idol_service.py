import random
import math
from datetime import date, timedelta
from utils.dates import get_today_date_str, get_today_date

class IdolService:
    def __init__(self, db, repository):
        self.db = db
        self.repository = repository

    def choose_idol_of_the_day(self, cursor, gamemode_id):
        """Choose a random idol as the 'Idol of the Day'"""

        COOLDOWN_DAYS = 10
        BOOST_DAYS = 50
        MULTIPLIER = 2
        
        today_date = get_today_date_str()
        today_date_obj = get_today_date()

        # Query to select today's idol
        sql_query = """
            SELECT idol_id FROM daily_picks WHERE pick_date = ? AND gamemode_id = ?
        """
        cursor.execute(sql_query, (today_date, gamemode_id))
        todays_pick = cursor.fetchone()

        if todays_pick:
            return todays_pick['idol_id']
        
        # Check if the date is valid
        time_delta = timedelta(days=COOLDOWN_DAYS)
        date_limit = (today_date_obj - time_delta).isoformat()
        
        # If no pick for today, select a random idol - if is_published = 1
        if gamemode_id == 1:
            sql_query = """
                SELECT id, (SELECT MAX(pick_date) FROM daily_picks WHERE idol_id = idols.id AND gamemode_id = ? AND pick_date <= ?) AS last_picked_date 
                FROM idols
                WHERE is_published = 1 
                AND id NOT IN (SELECT idol_id FROM daily_picks WHERE pick_date >= ? AND gamemode_id = ?)
            """
            cursor.execute(sql_query, (gamemode_id, today_date, date_limit, gamemode_id))

        elif gamemode_id == 2:
            sql_query = """
                SELECT i.id, (SELECT MAX(pick_date) FROM daily_picks WHERE idol_id = i.id AND gamemode_id = ? AND pick_date <= ?) AS last_picked_date
                FROM idols AS i
                INNER JOIN blurry_mode_data AS b ON i.id = b.idol_id
                WHERE i.is_published = 1
                AND i.id NOT IN (SELECT idol_id FROM daily_picks WHERE pick_date >= ? AND gamemode_id = ?)
            """
            cursor.execute(sql_query, (gamemode_id, today_date, date_limit, gamemode_id))

        # Fetch all available idols
        available_idols = cursor.fetchall()

        possible_idols = []
        weights = []

        """Error prevention: If there are no available idols (i.e., all idols have been picked in the last 20 days)"""
        # If no available idols, pick any random idol
        if available_idols:
            for idol in available_idols:
                idol_id = idol['id']
                last_picked_date = idol['last_picked_date'] or None

                try:
                    last_date = date.fromisoformat(last_picked_date) if last_picked_date else None
                    days_waiting = (today_date_obj - last_date).days if last_date else BOOST_DAYS

                except Exception as e:
                    print(f"Error parsing date for idol ID {idol_id}: {e}")
                    days_waiting = COOLDOWN_DAYS
                
                A = 1 
                K = 0.08
                weight = (A * math.exp(K * days_waiting))

                if not last_picked_date:
                    weight *= MULTIPLIER

                possible_idols.append(idol_id)
                weights.append(weight)

            selected_idol_id = random.choices(possible_idols, weights=weights, k=1)[0]
        
        else:
            if gamemode_id == 1:
                cursor.execute("SELECT id FROM idols WHERE is_published = 1")
          
                
            elif gamemode_id == 2:
                cursor.execute("""
                        SELECT i.id FROM idols AS i
                        INNER JOIN blurry_mode_data AS b ON i.id = b.idol_id
                        WHERE i.is_published = 1
                    """)  

            # Transform 'Row object' list to a simple list of ids
            available_idols_ids = [row['id'] for row in cursor.fetchall()]

            if not available_idols_ids: 
                return None

            # Randomly select one idol from the available idols
            selected_idol_id = random.choice(available_idols_ids)

        cursor.execute("""
            INSERT INTO daily_picks (pick_date, idol_id, gamemode_id) VALUES (?, ?, ?)
        """, (today_date, selected_idol_id, gamemode_id))
        
        cursor.execute("""
                UPDATE idols SET last_picked_date = ?
                WHERE id = ?
            """, (today_date, selected_idol_id))

        # Return the selected idol id
        return selected_idol_id