from utils.dates import get_today_date
from datetime import timedelta, date
import math

class GameService:
    def __init__(self, db, repository):
        self.db = db
        self.repository = repository

    def streak_calculation(self, cursor, user_id, gamemode_id):
            cursor.execute("""
                    SELECT date, won FROM daily_user_history
                    WHERE user_id = %s AND won = TRUE AND gamemode_id = %s
                    ORDER BY date DESC
                """, (user_id, gamemode_id))
            
            results = cursor.fetchall()

            if not results:
                return 0
            
            streak = 0
            expected_date = get_today_date()
            # expected_date = get_server_date_obj()
            
            for row in results:
                game_date = row["date"] if isinstance(row["date"], date) else date.fromisoformat(row["date"])

                if game_date == expected_date:
                    streak += 1
                    expected_date -= timedelta(days=1)
                else:
                    break

            return streak
    
    def save_user_history(self, connect, cursor, user_id, gamemode_id, guessed_id, answer_data, answer_id, current_attempt, today, current_timestamp, analytics_data):
        is_correct = int(guessed_id) == int(answer_id)
        one_shot_win = is_correct and current_attempt == 1
    
        # Update user history in the database 
        try:
            # Check if user has already won today to prevent duplicate win stats
            already_won_today = False
            if is_correct:
                cursor.execute("""
                    SELECT won FROM daily_user_history
                    WHERE user_id = %s AND date = %s AND gamemode_id = %s AND won = TRUE
                """, (user_id, today, gamemode_id))
                already_won_today = cursor.fetchone() is not None

            won_at = current_timestamp if is_correct else None
            started_at_value = current_timestamp if current_attempt == 1 else None

            cursor.execute(
                """
                    INSERT INTO daily_user_history (user_id, date, gamemode_id, guesses_count, won, one_shot_win, won_at, started_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT(user_id, date, gamemode_id) DO UPDATE SET   
                    guesses_count = EXCLUDED.guesses_count,
                    won = EXCLUDED.won OR daily_user_history.won,
                    one_shot_win = EXCLUDED.one_shot_win OR daily_user_history.one_shot_win,
                    won_at = CASE WHEN EXCLUDED.won IS TRUE AND daily_user_history.won_at IS NULL
                    THEN EXCLUDED.won_at ELSE daily_user_history.won_at END,
                    started_at = CASE WHEN EXCLUDED.guesses_count = 1 AND daily_user_history.started_at IS NULL
                    THEN EXCLUDED.started_at ELSE daily_user_history.started_at END
                """, (user_id, today, gamemode_id, current_attempt, is_correct, 
                    one_shot_win, won_at, started_at_value))
                            
            if is_correct:
                formatted_analytics_data = ' | '.join([f"{key.capitalize()}: {value}" for key, value in analytics_data.items()])
                print(f"Victory! User {user_id} from {analytics_data.get('country', 'Unknown')} guessed correctly idol {answer_data.get('artist_name')} of ID {answer_id} in {current_attempt} attempts at date {today}.")
                print(f"Entire analytics data for User {user_id}: {formatted_analytics_data}")
                S0 = 10
                decay_rate = 0.1
                n = current_attempt

                score = S0 * round(math.exp(-decay_rate * (n - 1)), 3)

                cursor.execute("""
                        UPDATE daily_user_history
                        SET score = %s
                        WHERE user_id = %s AND date = %s AND gamemode_id = %s
                    """, (score, user_id, today, gamemode_id))

                # Only update stats / streak if this is the first win today
                if not already_won_today:
                    # Calculate streak
                    streak = self.streak_calculation(cursor, user_id, gamemode_id)
                    self._update_user_history(cursor, user_id, gamemode_id, streak, current_attempt, one_shot_win, today)

            connect.commit()
            return is_correct

        except Exception as e:
            cursor.execute("ROLLBACK")
            print(f"Error updating user history: {e}")
            raise e
    
    def _update_user_history(self, cursor, user_id, gamemode_id, streak, current_attempt, one_shot_win, today):

        cursor.execute("""
            INSERT INTO user_history 
            (user_id, gamemode_id, current_streak, max_streak, wins_count, average_guesses, one_shot_wins, last_played_date)
            VALUES (%s, %s, %s, %s, 1, %s, %s, %s)
            ON CONFLICT(user_id, gamemode_id) DO UPDATE SET
                    current_streak = EXCLUDED.current_streak,
                    max_streak = GREATEST(user_history.max_streak, EXCLUDED.max_streak),
                    wins_count = user_history.wins_count + 1,
                    average_guesses = ROUND(((user_history.average_guesses * user_history.wins_count + EXCLUDED.average_guesses) / (user_history.wins_count + 1))::numeric, 2),
                    one_shot_wins = user_history.one_shot_wins + EXCLUDED.one_shot_wins,
                    last_played_date = EXCLUDED.last_played_date
            """, (
                user_id, 
                gamemode_id,
                streak,
                streak, 
                float(current_attempt), 
                1 if one_shot_win else 0,
                today
            )
        )
