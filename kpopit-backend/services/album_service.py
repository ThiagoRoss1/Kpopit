from services.game_service import GameService
from utils.dates import get_current_timestamp, get_today_date_str

class AlbumService:
    """Business logic for the Pixelated gamemode (gamemode_id = 3)."""

    def __init__(self, db):
        self.db = db

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
        analytics_data: dict,
        gamemode_id: int = 3,
    ) -> dict:
        """Compare the guess with today's album and record it.
        Persistence (upsert, score, streaks, double-count guard, commit) belongs to
        GameService.save_user_history; this only resolves both albums for it and the response."""
        today = get_today_date_str()
        current_timestamp = get_current_timestamp()

        try:
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

            # Answer payload for save_user_history's victory log (album_name/group_name).
            cursor.execute(
                """
                    SELECT a.name AS album_name,
                        COALESCE(i.artist_name, g.name) AS group_name
                    FROM albums a
                    LEFT JOIN groups g ON g.id = a.group_id
                    LEFT JOIN idols i ON i.id = a.soloist_id
                    WHERE a.id = %s
                """,
                (correct_id,),
            )
            answer_row = cursor.fetchone()
            answer_data = {
                "album_name": answer_row["album_name"] if answer_row else None,
                "group_name": answer_row["group_name"] if answer_row else None,
            }

            # Guessed album for the response (pure read; fetched before delegating to save_user_history).
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

            game_service = GameService(connect, None)
            # Pixelated never grants collection cards (for Album 1) (gamemode 3); discard card_granted.
            is_correct, _ = game_service.save_user_history(
                connect, cursor, user_id, gamemode_id, guess_album_id, answer_data,
                correct_id, current_attempt, today, current_timestamp, analytics_data,
            )

        except Exception as e:
            connect.rollback()
            raise e

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
    
    # Future albums page - to_char(a.release_date, 'YYYY-MM-DD') AS release_date to fetch the entire release date.
