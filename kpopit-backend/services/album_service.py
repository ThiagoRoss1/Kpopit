import math
import random
from datetime import date, timedelta

from services.game_service import GameService
from utils.dates import get_current_timestamp, get_today_date, get_today_date_str


class AlbumService:
    """Business logic for the Pixelated gamemode (gamemode_id = 3)."""

    def __init__(self, db):
        self.db = db

    def choose_album_of_the_day(self, cursor, gamemode_id: int = 3) -> int | None:
        """Pick today's album using the same exponential-weighting algorithm
        as IdolService.choose_idol_of_the_day."""

        COOLDOWN_DAYS = 10
        BOOST_DAYS = 50
        MULTIPLIER = 2

        today_str = get_today_date_str()
        today_obj = get_today_date()

        cursor.execute(
            "SELECT album_id FROM daily_picks WHERE pick_date = %s AND gamemode_id = %s",
            (today_str, gamemode_id),
        )
        existing = cursor.fetchone()
        if existing and existing["album_id"]:
            return existing["album_id"]

        date_limit = (today_obj - timedelta(days=COOLDOWN_DAYS)).isoformat()

        cursor.execute(
            """
                SELECT a.id,
                    (SELECT MAX(pick_date) FROM daily_picks
                     WHERE album_id = a.id AND gamemode_id = %s AND pick_date <= %s) AS last_picked_date
                FROM albums a
                WHERE a.is_published = TRUE
                AND a.id NOT IN (
                    SELECT album_id FROM daily_picks
                    WHERE pick_date >= %s AND gamemode_id = %s AND album_id IS NOT NULL
                )
            """,
            (gamemode_id, today_str, date_limit, gamemode_id),
        )
        candidates = cursor.fetchall()

        possible, weights = [], []
        if candidates:
            for row in candidates:
                lpd = row["last_picked_date"]
                try:
                    last = lpd if isinstance(lpd, date) else (date.fromisoformat(lpd) if lpd else None)
                    days_waiting = (today_obj - last).days if last else BOOST_DAYS
                except Exception:
                    days_waiting = COOLDOWN_DAYS
                weight = math.exp(0.08 * days_waiting)
                if not lpd:
                    weight *= MULTIPLIER
                possible.append(row["id"])
                weights.append(weight)
            selected_id = random.choices(possible, weights=weights, k=1)[0]
        else:
            cursor.execute("SELECT id FROM albums WHERE is_published = TRUE")
            ids = [r["id"] for r in cursor.fetchall()]
            if not ids:
                return None
            selected_id = random.choice(ids)

        cursor.execute(
            "INSERT INTO daily_picks (pick_date, album_id, gamemode_id) VALUES (%s, %s, %s)",
            (today_str, selected_id, gamemode_id),
        )
        return selected_id

    def get_daily_album(self, cursor, gamemode_id: int = 3) -> dict | None:
        """Return today's album (joined for cover/palette only), or None.

        Does NOT include `name` or `group_name` — those would reveal the answer
        and are only returned from `process_guess`.
        """
        today = get_today_date_str()
        cursor.execute(
            """
                SELECT a.id AS album_id,
                       a.cover_path,
                       a.palette,
                       a.type,
                       EXTRACT(YEAR FROM a.release_date)::int AS release_year,
                       COALESCE(i.artist_name, g.name) AS group_name
                FROM daily_picks dp
                JOIN albums a ON a.id = dp.album_id
                LEFT JOIN idols i ON i.id = a.soloist_id
                LEFT JOIN groups g ON g.id = a.group_id
                WHERE dp.pick_date = %s AND dp.gamemode_id = %s
                LIMIT 1
            """,
            (today, gamemode_id),
        )
        row = cursor.fetchone()
        return dict(row) if row else None
    
    def get_album_by_id(self, cursor, album_id: int) -> dict | None:
        """Fetch album by ID"""
        cursor.execute(
            """
                SELECT a.id AS album_id,
                    a.cover_path,
                    a.palette,
                    a.type,
                    EXTRACT(YEAR FROM a.release_date)::int AS release_year,
                COALESCE(i.artist_name, g.name) AS group_name
                FROM albums a
                LEFT JOIN idols i ON i.id = a.soloist_id
                LEFT JOIN groups g ON g.id = a.group_id
                WHERE a.id = %s
            """, (album_id,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None

    def process_guess(
        self,
        cursor,
        connect,
        user_id: int,
        guess_album_id: int,
        current_attempt: int,
        gamemode_id: int = 3,
    ) -> dict:
        """Compare guess vs today's correct album and persist to daily_user_history.

        On a win: also writes `score`, bumps aggregate stats / streaks in
        `user_history` (mirrors GameService.save_user_history), and guards
        against double-counting replays after a win.
        """
        today = get_today_date_str()
        current_timestamp = get_current_timestamp()

        cursor.execute(
            """
                SELECT album_id FROM daily_picks
                WHERE pick_date = %s AND gamemode_id = %s
            """,
            (today, gamemode_id),
        )
        pick = cursor.fetchone()
        if not pick:
            return {"error": "No daily pick found"}

        correct_id = pick["album_id"]
        is_correct = int(guess_album_id) == int(correct_id)
        one_shot_win = is_correct and current_attempt == 1
        won_at = current_timestamp if is_correct else None
        started_at = current_timestamp if current_attempt == 1 else None

        try:
            already_won_today = False
            if is_correct:
                cursor.execute(
                    """
                        SELECT won FROM daily_user_history
                        WHERE user_id = %s AND date = %s AND gamemode_id = %s AND won = TRUE
                    """,
                    (user_id, today, gamemode_id),
                )
                already_won_today = cursor.fetchone() is not None

            cursor.execute(
                """
                    INSERT INTO daily_user_history
                        (user_id, date, gamemode_id, guesses_count, won, one_shot_win, won_at, started_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT(user_id, date, gamemode_id) DO UPDATE SET
                        guesses_count = EXCLUDED.guesses_count,
                        won = EXCLUDED.won OR daily_user_history.won,
                        one_shot_win = EXCLUDED.one_shot_win OR daily_user_history.one_shot_win,
                        won_at = CASE WHEN EXCLUDED.won IS TRUE AND daily_user_history.won_at IS NULL
                                    THEN EXCLUDED.won_at ELSE daily_user_history.won_at END,
                        started_at = CASE WHEN EXCLUDED.guesses_count = 1 AND daily_user_history.started_at IS NULL
                                    THEN EXCLUDED.started_at ELSE daily_user_history.started_at END
                """,
                (user_id, today, gamemode_id, current_attempt, is_correct, one_shot_win, won_at, started_at),
            )

            if is_correct:
                S0 = 10
                decay_rate = 0.1
                score = S0 * round(math.exp(-decay_rate * (current_attempt - 1)), 3)
                cursor.execute(
                    """
                        UPDATE daily_user_history
                        SET score = %s
                        WHERE user_id = %s AND date = %s AND gamemode_id = %s
                    """,
                    (score, user_id, today, gamemode_id),
                )

                if not already_won_today:
                    game_service = GameService(connect, None)
                    streak = game_service.streak_calculation(cursor, user_id, gamemode_id)
                    game_service._update_user_history(
                        cursor, user_id, gamemode_id, streak, current_attempt, one_shot_win, today
                    )

            cursor.execute(
                """
                    SELECT a.name, 
                        COALESCE(i.artist_name, g.name) AS group_name, 
                        a.cover_path
                    FROM albums a
                    LEFT JOIN groups g ON g.id = a.group_id
                    LEFT JOIN idols i ON i.id = a.soloist_id
                    WHERE a.id = %s
                """, (guess_album_id,)
            )
            guessed = cursor.fetchone()

            connect.commit()

        except Exception:
            cursor.execute("ROLLBACK")
            raise

        return {
            "guess_correct": is_correct,
            "guessed_album_data": {
                "album_id": guess_album_id,
                "album_name": guessed["name"] if guessed else None,
                "group_name": guessed["group_name"] if guessed else None,
                "cover_path": guessed["cover_path"] if guessed else None,
            },
        }

    def get_all_albums(self, cursor) -> list[dict]:
        """Return every published album for client-side search caching.

        Mirrors the idol list flow (`/idols-list` → `["allIdols"]`): the frontend
        fetches this once and filters locally, so there's no per-keystroke endpoint.
        """
        cursor.execute(
            """
                SELECT a.id,
                       a.name,
                       COALESCE(i.artist_name, g.name) AS group_name,
                       a.cover_path,
                       a.type,
                       a.language,
                       EXTRACT(YEAR FROM a.release_date)::int AS release_year
                FROM albums a
                LEFT JOIN groups g ON g.id = a.group_id
                LEFT JOIN idols i ON i.id = a.soloist_id
                WHERE a.is_published = TRUE
                ORDER BY a.name ASC
            """
        )
        return [dict(r) for r in cursor.fetchall()]
