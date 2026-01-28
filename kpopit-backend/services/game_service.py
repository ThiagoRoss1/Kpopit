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
                    WHERE user_id = ? AND won = 1 AND gamemode_id = ?
                    ORDER BY date DESC
                """, (user_id, gamemode_id))
            
            results = cursor.fetchall()

            if not results:
                return 0
            
            streak = 0
            expected_date = get_today_date()
            # expected_date = get_server_date_obj()
            
            for row in results:
                game_date = date.fromisoformat(row["date"])

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
            cursor.execute("BEGIN TRANSACTION")

            cursor.execute(
                """
                    INSERT INTO daily_user_history (user_id, date, gamemode_id, guesses_count, won, one_shot_win, won_at, started_at)
                    VALUES (?, ?, ?, ?, ?, ?, 
                        CASE WHEN ? = 1 THEN ? ELSE NULL END, 
                        CASE WHEN ? = 1 THEN ? ELSE NULL END)
                    ON CONFLICT(user_id, date, gamemode_id) DO UPDATE SET   
                    guesses_count = excluded.guesses_count,
                    won = excluded.won OR won,
                    one_shot_win = excluded.one_shot_win OR one_shot_win,
                    won_at = CASE WHEN excluded.won = 1 AND daily_user_history.won_at IS NULL
                    THEN excluded.won_at ELSE daily_user_history.won_at END,
                    started_at = CASE WHEN excluded.guesses_count = 1 AND daily_user_history.started_at IS NULL
                    THEN excluded.started_at ELSE daily_user_history.started_at END
                """, (user_id, today, gamemode_id, current_attempt, is_correct, 
                    one_shot_win, is_correct, current_timestamp, 
                    current_attempt, current_timestamp))
                            
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
                        SET score = ?
                        WHERE user_id = ? AND date = ? AND gamemode_id = ?
                    """, (score, user_id, today, gamemode_id))

                # Calculate streak function
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
            VALUES (?, ?, ?, ?, 1, ?, ?, ?)
            ON CONFLICT(user_id, gamemode_id) DO UPDATE SET
                    current_streak = ?,
                    max_streak = MAX(max_streak, ?),
                    wins_count = wins_count + 1,
                    average_guesses = ROUND((average_guesses * (wins_count) + ? ) / (wins_count + 1), 2),
                    one_shot_wins = one_shot_wins + ?,
                    last_played_date = ?
            """, (
                user_id, 
                gamemode_id,
                streak,
                streak, 
                current_attempt, 
                1 if one_shot_win else 0,
                today,           
                # Update values:
                streak,
                streak,
                current_attempt,
                1 if one_shot_win else 0,
                today
            )
        )
