import os
from dotenv import load_dotenv
from utils.dates import utc_now

load_dotenv()

# Off by default: without the flag the /api/idol-xp routes aren't registered.
IDOL_XP_ENABLED = os.getenv("IDOL_XP_ENABLED", "false").lower() == "true"

# The formula lives here so it can change freely: XP is computed from history, never stored.
LIVE_GAME_XP = 10
ONE_SHOT_BONUS = 3
FAST_WIN_BONUS = 1
FAST_WIN_MAX_ATTEMPTS = 3
CALENDAR_GAME_XP = 5
MAX_LEVEL = 10
MAX_LEVEL_SHARE = 0.4  # an idol at max level still receives this part of new XP (no cap yet)
POTION_CAP = 150


def level_threshold(level: int) -> int:
    """Total XP needed to reach `level`."""
    return 3 * level * level


def level_for(xp: float) -> int:
    return max((n for n in range(MAX_LEVEL + 1) if xp >= level_threshold(n)), default=0)


def game_xp(row: dict) -> int:
    """XP of one completed game. Unfinished games give nothing; streaks don't matter. A one-shot win is
    also a win in <= 3 attempts, so it gets both bonuses."""
    if not row["won"]:
        return 0
    if row["is_calendar"]:
        return CALENDAR_GAME_XP
    attempts = row["guesses_count"] or 0
    xp = LIVE_GAME_XP
    if row["one_shot_win"]:
        xp += ONE_SHOT_BONUS
    if 0 < attempts <= FAST_WIN_MAX_ATTEMPTS:
        xp += FAST_WIN_BONUS
    return xp


def add_xp(current: float, gained: float) -> float:
    """Full XP up to max level, MAX_LEVEL_SHARE of whatever lands past it."""
    room = max(level_threshold(MAX_LEVEL) - current, 0)
    full = min(gained, room)
    return current + full + (gained - full) * MAX_LEVEL_SHARE


class XpError(Exception):
    """A request the route answers with this message and status."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


class XpService:
    """Idol XP and the potion, computed from completed games (live + calendar) and the selection
    history: a game's XP goes to the idol selected when it was completed, or to the potion (capped)
    when none was. Backfilled games never give idol XP, only potion. Classic/Blurry/Pixelated (and a
    future Classic GG/BG split) all count the same."""

    def __init__(self, db):
        self.db = db

    def current_selection(self, cursor, user_id: int) -> dict | None:
        cursor.execute(
            """
                SELECT s.idol_id, s.selected_from, i.artist_name, i.image_path
                FROM idol_selections s JOIN idols i ON i.id = s.idol_id
                WHERE s.user_id = %s AND s.selected_to IS NULL
            """, (user_id,),
        )
        row = cursor.fetchone()
        return {**row, "selected_from": row["selected_from"].isoformat()} if row else None

    def select(self, cursor, user_id: int, idol_id) -> dict:
        """Make `idol_id` the current idol: the current selection closes, a new one opens. XP already
        earned stays with the idol that earned it. The caller commits."""
        if not isinstance(idol_id, int) or isinstance(idol_id, bool):
            raise XpError("Unknown idol")
        cursor.execute("SELECT 1 FROM idols WHERE id = %s AND is_published = TRUE", (idol_id,))
        if not cursor.fetchone():
            raise XpError("Unknown idol")
        # Locks the user's row so two selections at once can't both open a current one.
        cursor.execute("SELECT id FROM users WHERE id = %s FOR UPDATE", (user_id,))
        current = self.current_selection(cursor, user_id)
        if current and current["idol_id"] == idol_id:
            return current
        now = utc_now()
        cursor.execute("UPDATE idol_selections SET selected_to = %s WHERE user_id = %s AND selected_to IS NULL",
                       (now, user_id))
        cursor.execute("INSERT INTO idol_selections (user_id, idol_id, selected_from) VALUES (%s, %s, %s)",
                       (user_id, idol_id, now))
        return self.current_selection(cursor, user_id)

    def _completed_games(self, cursor, user_id: int) -> list[dict]:
        cursor.execute(
            """
                SELECT won, is_calendar, one_shot_win, guesses_count, guesses_origin, won_at
                FROM daily_user_history
                WHERE user_id = %s AND won = TRUE
                ORDER BY won_at NULLS FIRST, id
            """, (user_id,),
        )
        return cursor.fetchall()

    def _selections(self, cursor, user_id: int) -> list[dict]:
        cursor.execute(
            "SELECT idol_id, selected_from, selected_to FROM idol_selections WHERE user_id = %s ORDER BY selected_from",
            (user_id,),
        )
        return cursor.fetchall()

    def compute(self, cursor, user_id: int) -> tuple[dict[int, float], float]:
        """({idol_id: xp}, potion) for the user, replaying games in completion order."""
        selections = self._selections(cursor, user_id)
        idol_xp: dict[int, float] = {}
        potion = 0.0
        for game in self._completed_games(cursor, user_id):
            xp = game_xp(game)
            idol = None
            if game["won_at"] is not None and game["guesses_origin"] != "backfill":
                idol = next((s["idol_id"] for s in selections
                             if s["selected_from"] <= game["won_at"]
                             and (s["selected_to"] is None or game["won_at"] < s["selected_to"])), None)
            if idol is None:
                potion = min(potion + xp, POTION_CAP)
            else:
                idol_xp[idol] = add_xp(idol_xp.get(idol, 0.0), xp)
        return idol_xp, potion

    def potion(self, cursor, user_id: int) -> int:
        return int(self.compute(cursor, user_id)[1])

    def state(self, cursor, user_id: int) -> dict:
        idol_xp, potion = self.compute(cursor, user_id)
        names = {}
        if idol_xp:
            cursor.execute("SELECT id, artist_name, image_path FROM idols WHERE id = ANY(%s)", (list(idol_xp),))
            names = {row["id"]: row for row in cursor.fetchall()}
        idols = []
        for idol_id, xp in sorted(idol_xp.items(), key=lambda item: -item[1]):
            level = level_for(xp)
            idols.append({
                "idol_id": idol_id,
                "artist_name": names.get(idol_id, {}).get("artist_name"),
                "image_path": names.get(idol_id, {}).get("image_path"),
                "xp": round(xp, 1),
                "level": level,
                "next_level_xp": level_threshold(level + 1) if level < MAX_LEVEL else None,
            })
        return {
            "current": self.current_selection(cursor, user_id),
            "idols": idols,
            "potion": {"xp": int(potion), "cap": POTION_CAP},
        }
