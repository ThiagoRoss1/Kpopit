import json
from services.album_service import AlbumService
from services.game_service import GameService
from services.idol_guess_service import IdolGuessService

# game_state keeps only screen state (hints, animations); guesses come from guessed_ids.
SCREEN_STATE_KEYS = ("hints_revealed", "show_hints", "colorize_hints", "animated_idols", "game_date")

MODE_KEYS = {1: "classic", 2: "blurry", 3: "pixelated"}


def screen_state_only(state) -> dict:
    """The screen-state subset of a client game_state payload (anything else is dropped)."""
    if not isinstance(state, dict):
        return {}
    return {key: state[key] for key in SCREEN_STATE_KEYS if key in state}


def _parse_state(raw) -> dict:
    if isinstance(raw, dict):
        return raw
    try:
        state = json.loads(raw) if raw else {}
    except (TypeError, ValueError):
        return {}
    return state if isinstance(state, dict) else {}


class RestoreService:
    """Rebuilds a user's game of the day per mode from daily_user_history (guess order from
    guessed_ids, feedback recomputed now); legacy rows without guessed_ids fall back to game_state."""

    def __init__(self, db, repository):
        self.db = db
        self.repository = repository

    def build(self, cursor, user_id: int, today: str) -> dict:
        result = {"server_date": today}
        for gamemode_id, key in MODE_KEYS.items():
            result[key] = self.build_mode(cursor, user_id, today, gamemode_id)
        return result

    def build_mode(self, cursor, user_id: int, today: str, gamemode_id: int) -> dict | None:
        cursor.execute(
            """
                SELECT guessed_ids, won, game_state FROM daily_user_history
                WHERE user_id = %s AND date = %s AND gamemode_id = %s
            """,
            (user_id, today, gamemode_id),
        )
        row = cursor.fetchone()
        if not row:
            return None

        state = _parse_state(row.get("game_state"))
        guessed_ids = row.get("guessed_ids") or []
        if not guessed_ids:
            return state or None

        answer_id = GameService(self.db, self.repository).resolve_answer_id(cursor, gamemode_id, today)
        won = bool(row.get("won"))
        screen = screen_state_only(state)

        if gamemode_id == 3:
            details = AlbumService(self.db).guess_details(cursor, guessed_ids, answer_id)
            return {**screen, "pixelated_guesses_details": details,
                    "guessed_albums": [d["album_name"] for d in details],
                    "game_complete": won, "game_won": won, "game_date": today}

        guess_service = IdolGuessService(self.repository)
        build = guess_service.classic_result if gamemode_id == 1 else guess_service.blurry_result
        details = [detail for detail in (build(idol_id, answer_id) for idol_id in guessed_ids) if detail]
        names = [d["guessed_idol_data"]["artist_name"] for d in details]
        if gamemode_id == 1:
            # Already-shown rows must not replay their reveal animation after a restore.
            return {"animated_idols": list(guessed_ids), **screen, "today_guesses_details": details, "guessed_idols": names,
                    "game_complete": won, "game_won": won, "game_date": today}
        return {**screen, "blurry_guesses_details": details, "guessed_idols": names,
                "game_complete": won, "game_won": won, "game_date": today}
