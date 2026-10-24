from utils.dates import get_today_date
from services.daily_draw import ensure_daily_picks
from services.collections_service import CollectionService, COLLECTION_ENABLED, COLLECTION_GAMEMODE_IDS
from datetime import timedelta, date
import math
import logging

logger = logging.getLogger(__name__)

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

        for row in results:
            game_date = row["date"] if isinstance(row["date"], date) else date.fromisoformat(row["date"])

            if game_date == expected_date:
                streak += 1
                expected_date -= timedelta(days=1)
            else:
                break

        return streak
    
    def resolve_answer_id(self, cursor, gamemode_id: int) -> int | None:
        """Today's answer for the mode, read from daily_picks (drawn first if missing). The client's
        answer_id is never trusted."""
        return ensure_daily_picks(cursor, gamemode_id)

    def _append_guess(self, cursor, user_id, gamemode_id, guessed_id, today, current_timestamp):
        """Record the guess once, atomically. Returns (attempt, appended, recorded): the guess's 1-based
        attempt (a repeated id keeps its first one; None when the day was won before this guess),
        whether this call added it, and how many ids the row now holds."""
        cursor.execute("""
                INSERT INTO daily_user_history (user_id, date, gamemode_id, guesses_count, won, started_at)
                VALUES (%s, %s, %s, 0, FALSE, %s)
                ON CONFLICT (user_id, date, gamemode_id) DO NOTHING
            """, (user_id, today, gamemode_id, current_timestamp))

        # The row lock serializes concurrent guesses; the re-checked WHERE drops a duplicate.
        # guesses_count (not the array length) is returned so a game started before guessed_ids
        # existed keeps counting from its old attempts; for every other row the two are equal.
        cursor.execute("""
                UPDATE daily_user_history
                SET guessed_ids = array_append(COALESCE(guessed_ids, '{}'), %(guessed_id)s),
                    guesses_count = COALESCE(guesses_count, 0) + 1,
                    guesses_origin = COALESCE(guesses_origin, 'live'),
                    started_at = COALESCE(started_at, %(ts)s)
                WHERE user_id = %(user_id)s AND date = %(today)s AND gamemode_id = %(gamemode_id)s
                  AND won IS NOT TRUE
                  AND NOT (%(guessed_id)s = ANY(COALESCE(guessed_ids, '{}')))
                RETURNING guesses_count, cardinality(guessed_ids) AS recorded
            """, {"guessed_id": guessed_id, "ts": current_timestamp, "user_id": user_id,
                  "today": today, "gamemode_id": gamemode_id})
        row = cursor.fetchone()
        if row:
            return row["guesses_count"], True, row["recorded"]

        cursor.execute("""
                SELECT array_position(guessed_ids, %s) AS position, cardinality(guessed_ids) AS recorded
                FROM daily_user_history
                WHERE user_id = %s AND date = %s AND gamemode_id = %s
            """, (guessed_id, user_id, today, gamemode_id))
        existing = cursor.fetchone() or {}
        return existing.get("position"), False, existing.get("recorded")

    def save_user_history(self, connect, cursor, user_id, gamemode_id, guessed_id, answer_data, answer_id, today, current_timestamp, analytics_data):
        """Record one guess and, on the first correct one, the win (score, streak, stats, card).
        The attempt number comes from the server's guess list; returns (is_correct, card_granted)."""
        analytics_data = analytics_data or {}
        answer_data = answer_data or {}
        guessed_id = int(guessed_id)
        is_correct = guessed_id == int(answer_id)
        card_granted = None

        try:
            attempt, appended, recorded = self._append_guess(
                cursor, user_id, gamemode_id, guessed_id, today, current_timestamp
            )

            if is_correct and appended:
                one_shot_win = attempt == 1 and recorded == 1
                # Internal id only: never the token, username or email.
                logger.info("Victory! User %s won gamemode %s in %s attempts at date %s.",
                            user_id, gamemode_id, attempt, today)
                S0 = 10
                decay_rate = 0.1
                score = S0 * round(math.exp(-decay_rate * (attempt - 1)), 3)

                cursor.execute("""
                        UPDATE daily_user_history
                        SET won = TRUE, one_shot_win = %s, won_at = %s, score = %s
                        WHERE user_id = %s AND date = %s AND gamemode_id = %s
                    """, (one_shot_win, current_timestamp, score, user_id, today, gamemode_id))

                streak = self.streak_calculation(cursor, user_id, gamemode_id)
                self._update_user_history(cursor, user_id, gamemode_id, streak, attempt, one_shot_win, today)

                if COLLECTION_ENABLED and gamemode_id in COLLECTION_GAMEMODE_IDS:
                    # A collection failure must never cost the win: the savepoint confines it,
                    # since psycopg poisons the whole transaction after any failed statement.
                    cursor.execute("SAVEPOINT collection_grant")
                    try:
                        card_granted = CollectionService(self.db).grant_card_for_win(
                            cursor, user_id, int(answer_id), current_timestamp
                        )
                        cursor.execute("RELEASE SAVEPOINT collection_grant")
                    except Exception:
                        cursor.execute("ROLLBACK TO SAVEPOINT collection_grant")
                        card_granted = None
                        logger.exception(
                            "Collection card grant failed for user_id=%s idol_id=%s gamemode_id=%s date=%s "
                            "— win was saved, card was NOT granted. Manual backfill needed.", user_id, answer_id, gamemode_id, today
                        )

            connect.commit()
            return is_correct, card_granted

        except Exception as e:
            connect.rollback()
            logger.exception("Error updating user history")
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
