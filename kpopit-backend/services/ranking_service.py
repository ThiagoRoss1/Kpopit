from utils.dates import get_today_date_str


class RankingService:
    """Today's winner count and a player's place among today's winners, per gamemode.
    Rows filled by the history backfill (guesses_origin = 'backfill') never rank."""

    def __init__(self, db):
        self.db = db

    def get_daily_users_count(self, cursor, gamemode_id: int) -> int:
        """How many players won today's game in this mode."""
        cursor.execute("""
                SELECT COUNT(DISTINCT user_id) AS user_count
                FROM daily_user_history
                WHERE date = %s AND won = TRUE AND gamemode_id = %s AND guesses_origin IS DISTINCT FROM 'backfill'
            """, (get_today_date_str(), gamemode_id))
        result = cursor.fetchone()
        return result["user_count"] if result and result["user_count"] is not None else 0

    def get_daily_rank(self, cursor, user_token: str, gamemode_id: int) -> dict | None:
        """Position (by win time), rank (by guesses, then solve time) and score; None for an unknown token."""
        today = get_today_date_str()

        cursor.execute("""
                SELECT id FROM users WHERE token = %s
            """, (user_token,))
        user_row = cursor.fetchone()
        if not user_row:
            return None
        user_id = user_row["id"]

        cursor.execute("""
                SELECT started_at, guesses_count, won_at FROM daily_user_history
                WHERE user_id = %s AND date = %s AND won = TRUE AND gamemode_id = %s
                  AND guesses_origin IS DISTINCT FROM 'backfill'
            """, (user_id, today, gamemode_id))
        result = cursor.fetchone()
        if not result or result["started_at"] is None or result["guesses_count"] is None or result["won_at"] is None:
            return {"rank": None, "message": "User has not finished today's game"}

        started_at = result["started_at"]
        guesses_count = result["guesses_count"]
        won_at = result["won_at"]

        cursor.execute("""
                SELECT COUNT(*) + 1 AS position FROM daily_user_history
                WHERE date = %s AND won = TRUE AND won_at < %s AND gamemode_id = %s
                  AND guesses_origin IS DISTINCT FROM 'backfill'
            """, (today, won_at, gamemode_id))
        position_result = cursor.fetchone()
        position = position_result["position"] if position_result else None

        cursor.execute("""
                SELECT COUNT(*) + 1 AS rank FROM daily_user_history d
                WHERE date = %s AND won = TRUE AND user_id != %s AND gamemode_id = %s
                AND d.guesses_origin IS DISTINCT FROM 'backfill'
                AND (
                    d.guesses_count < %s
                    OR (
                       d.guesses_count = %s
                       AND (
                            (d.won_at - d.started_at) < (%s::timestamptz - %s::timestamptz)
                            OR (
                                (d.won_at - d.started_at) = (%s::timestamptz - %s::timestamptz)
                                AND (d.won_at < %s)
                            )
                        )
                    )
                )
            """,
                (
                today, user_id, gamemode_id, guesses_count, guesses_count,
                won_at, started_at, won_at, started_at, won_at
                )
            )
        rank_result = cursor.fetchone()
        rank = rank_result["rank"] if rank_result else None

        cursor.execute("""
                SELECT score FROM daily_user_history
                WHERE user_id = %s AND date = %s AND won = TRUE AND gamemode_id = %s
            """, (user_id, today, gamemode_id))
        result = cursor.fetchone()
        user_score = result["score"] if result and result["score"] is not None else 0

        return {"position": position, "rank": rank, "score": user_score}
