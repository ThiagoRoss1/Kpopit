import os
from datetime import date, timedelta
from dotenv import load_dotenv
from services.album_service import AlbumService
from services.game_service import GameService
from services.idol_guess_service import IdolGuessService
from services.restore_service import RestoreService
from utils.dates import get_current_timestamp, get_today_date

load_dotenv()

# Off by default: without the flag the /api/calendar routes aren't registered and "yesterday's
# answer" stays visible to everyone (there is no calendar to play it in).
CALENDAR_ENABLED = os.getenv("CALENDAR_ENABLED", "false").lower() == "true"

MODES = {"classic": 1, "blurry": 2, "pixelated": 3}

# Timeline statuses. No mode has a lost state: a game is unfinished until it is won.
NOT_PLAYED, IN_PROGRESS, WON_LIVE, WON_CALENDAR = "not_played", "in_progress", "won_live", "won_calendar"


class CalendarError(Exception):
    """A request the route answers with this message and status."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def day_status(row: dict | None) -> str:
    if not row:
        return NOT_PLAYED
    if row["won"]:
        return WON_CALENDAR if row["is_calendar"] else WON_LIVE
    # guesses_count covers games from before guessed_ids existed.
    return IN_PROGRESS if row.get("guessed_ids") or row.get("guesses_count") else NOT_PLAYED


class CalendarService:
    """Past challenge days: any day from a mode's first pick up to today. Answers come from that
    day's daily_picks, guesses are recorded like live games (T40) and a past day finished here is a
    calendar game: win stats and the Album 1 card, never the streak or ranking."""

    def __init__(self, db, repository):
        self.db = db
        self.repository = repository

    def first_day(self, cursor, gamemode_id: int) -> date | None:
        cursor.execute("SELECT MIN(pick_date) AS first_day FROM daily_picks WHERE gamemode_id = %s", (gamemode_id,))
        row = cursor.fetchone()
        return row["first_day"] if row else None

    def challenge_day(self, cursor, gamemode_id: int, raw: str) -> str:
        """The validated YYYY-MM-DD day; raises CalendarError for a malformed, future or too early day."""
        try:
            day = date.fromisoformat(raw)
        except (TypeError, ValueError):
            raise CalendarError("Invalid challenge date") from None
        first = self.first_day(cursor, gamemode_id)
        if first is None or day < first or day > get_today_date():
            raise CalendarError("Invalid challenge date")
        return day.isoformat()

    def _row(self, cursor, user_id: int, gamemode_id: int, day: str) -> dict | None:
        cursor.execute(
            """
                SELECT guessed_ids, guesses_count, won, is_calendar FROM daily_user_history
                WHERE user_id = %s AND date = %s AND gamemode_id = %s
            """, (user_id, day, gamemode_id),
        )
        return cursor.fetchone()

    def timeline(self, cursor, user_id: int) -> dict:
        """Per mode, every challenge day from the first one to today, oldest first, with its status."""
        today = get_today_date()
        result = {}
        for name, gamemode_id in MODES.items():
            first = self.first_day(cursor, gamemode_id)
            if first is None:
                result[name] = []
                continue
            cursor.execute(
                """
                    SELECT date, guessed_ids, guesses_count, won, is_calendar FROM daily_user_history
                    WHERE user_id = %s AND gamemode_id = %s AND date BETWEEN %s AND %s
                """, (user_id, gamemode_id, first, today),
            )
            rows = {row["date"]: row for row in cursor.fetchall()}
            days = [first + timedelta(days=n) for n in range((today - first).days + 1)]
            result[name] = [{"date": day.isoformat(), "status": day_status(rows.get(day))} for day in days]
        return result

    def day(self, cursor, user_id: int, mode: str, raw_day: str) -> dict:
        """A day's puzzle (hints only), the caller's game and, once they finished it, the answer."""
        gamemode_id = MODES[mode]
        day = self.challenge_day(cursor, gamemode_id, raw_day)
        answer_id = GameService(self.db, self.repository).resolve_answer_id(cursor, gamemode_id, day)
        if answer_id is None:
            raise CalendarError("Invalid challenge date")
        row = self._row(cursor, user_id, gamemode_id, day)
        status = day_status(row)
        finished = status in (WON_LIVE, WON_CALENDAR)
        puzzle, answer = self._puzzle(cursor, gamemode_id, answer_id)
        return {
            "challenge_date": day,
            "mode": mode,
            "status": status,
            "puzzle": puzzle,
            "game": RestoreService(self.db, self.repository).build_mode(cursor, user_id, day, gamemode_id),
            # Same rule as live games: the answer only after the player finished the day.
            "answer": answer if finished else None,
        }

    def _puzzle(self, cursor, gamemode_id: int, answer_id: int) -> tuple[dict, dict]:
        """(what the player needs to play, what would reveal the answer)."""
        if gamemode_id == 3:
            album = AlbumService(self.db).get_album_by_id(cursor, answer_id) or {}
            cursor.execute("SELECT name FROM albums WHERE id = %s", (answer_id,))
            name = cursor.fetchone()
            puzzle = {key: album.get(key) for key in ("cover_path", "palette", "type", "release_year", "group_name")}
            return puzzle, {"album_id": answer_id, "album_name": name["name"] if name else None}

        idol = dict(self.repository.fetch_full_idol_data(answer_id) or {})
        answer = {key: idol.get(key) for key in ("idol_id", "artist_name", "image_path", "image_version")}
        if gamemode_id == 2:
            blurry = self.repository.fetch_blurry_idol_data(answer_id) or {}
            return {key: blurry.get(key) for key in ("blur_image_path", "blur_image_version")}, answer

        career = self.repository.fetch_full_idol_career(answer_id)
        groups = [c["group_name"] for c in career if c.get("is_active")]
        if not groups and idol.get("is_former_group"):
            groups = [idol.get("group_name")]
        puzzle = {
            "categories": ["Artist Name", "Gender", "Group", "Companies", "Nationality",
                           "Debut Year", "Birth Date", "Height", "Position"],
            "member_count": idol.get("member_count"),
            "groups": groups,
            "is_former_group": idol.get("is_former_group", False),
        }
        return puzzle, answer

    def guess(self, cursor, user_id: int, mode: str, raw_day: str, guessed_id, analytics_data: dict) -> dict:
        """Record a guess on a challenge day. A finished day is view-only; finishing a past day here
        (even one started live) makes it a calendar game."""
        gamemode_id = MODES[mode]
        day = self.challenge_day(cursor, gamemode_id, raw_day)
        if not isinstance(guessed_id, int) or isinstance(guessed_id, bool) or guessed_id <= 0:
            raise CalendarError("Missing guess")
        if day_status(self._row(cursor, user_id, gamemode_id, day)) in (WON_LIVE, WON_CALENDAR):
            raise CalendarError("This day is already finished", 409)
        is_calendar = day != get_today_date().isoformat()

        if gamemode_id == 3:
            result = AlbumService(self.db).process_guess(
                cursor, self.db, user_id, guessed_id, analytics_data, gamemode_id=3, day=day, is_calendar=is_calendar,
            )
            if "error" in result:
                raise CalendarError(result["error"])
            return result

        game_service = GameService(self.db, self.repository)
        answer_id = game_service.resolve_answer_id(cursor, gamemode_id, day)
        if answer_id is None:
            raise CalendarError("Invalid challenge date")
        guess_service = IdolGuessService(self.repository)
        build = guess_service.classic_result if gamemode_id == 1 else guess_service.blurry_result
        result = build(guessed_id, answer_id)
        if not result:
            raise CalendarError("Idol not found", 404)
        is_correct, card_granted = game_service.save_user_history(
            self.db, cursor, user_id, gamemode_id, guessed_id, {}, answer_id,
            day, get_current_timestamp(), analytics_data, is_calendar=is_calendar,
        )
        return {**result, "guess_correct": is_correct, "card_granted": card_granted}
