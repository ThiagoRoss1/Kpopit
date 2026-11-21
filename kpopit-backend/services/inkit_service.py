import base64
import binascii
import zlib
from datetime import date
from services.game_service import GameService
from services.inkit_mode import (
    DRAFT_MAX_BYTES, DRAFT_RAW_LENGTH, DRAFT_VERSION, GROUP_HINT_ROUND, INK_HINT_ROUND, INKIT_GAMEMODE_ID,
    PEN_ROUND, PHOTO_ROUND,
)
from utils.dates import get_current_timestamp, utc_now

# base64 grows the blob by 4/3; anything longer can't be a valid drawing.
DRAFT_MAX_BASE64 = (DRAFT_MAX_BYTES + 2) // 3 * 4


class InkItError(Exception):
    """A request the route answers with this message and status."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def decode_draft(raw) -> bytes | None:
    """The drawing of a guess (base64 of the deflated [version byte + packed masks]), checked: the
    compressed size cap, then the inflated length and version. None when the guess carries no
    drawing; InkItError for anything else. Stored as sent (compressed)."""
    if raw is None:
        return None
    if not isinstance(raw, str) or not raw or len(raw) > DRAFT_MAX_BASE64:
        raise InkItError("Invalid drawing")
    try:
        blob = base64.b64decode(raw, validate=True)
    except (binascii.Error, ValueError):
        raise InkItError("Invalid drawing") from None
    if not blob or len(blob) > DRAFT_MAX_BYTES:
        raise InkItError("Invalid drawing")

    # max_length stops a small blob from inflating past the expected size.
    inflater = zlib.decompressobj()
    try:
        packed = inflater.decompress(blob, DRAFT_RAW_LENGTH + 1)
    except zlib.error:
        raise InkItError("Invalid drawing") from None
    if (len(packed) != DRAFT_RAW_LENGTH or packed[0] != DRAFT_VERSION or not inflater.eof
            or inflater.unused_data or inflater.unconsumed_tail):
        raise InkItError("Invalid drawing")
    return blob


class InkItService:
    """InkIt (gamemode 4): the day's photo, the caller's game (guesses, drawing, hints) and its
    guesses. The answer's id and name never leave the server before the caller won that day."""

    def __init__(self, db, repository):
        self.db = db
        self.repository = repository

    def photo(self, cursor, idol_id: int) -> dict | None:
        """The one reader of an idol's three stored paths (never image_file, which names the idol).
        Only idols in the mode (an active row, what the draw picks from): a day whose answer left it
        gets no files, so neither the layers nor the emergency photo are ever served for it."""
        cursor.execute(
            "SELECT image_path, pencil_path, pen_path, image_version FROM inkit_mode_data "
            "WHERE idol_id = %s AND is_active",
            (idol_id,),
        )
        return cursor.fetchone()

    def unlocked_files(self, cursor, answer_id: int, round_number: int, won: bool) -> dict | None:
        """The stored paths the caller may load at `round_number` (wrong guesses + 1): the pencil,
        the pen from PEN_ROUND, the photo from PHOTO_ROUND. A won game gets all three (the reveal
        draws every layer). None for an idol outside the mode."""
        row = self.photo(cursor, answer_id)
        if not row:
            return None
        files = {"version": row["image_version"], "pencil": row["pencil_path"]}
        if won or round_number >= PEN_ROUND:
            files["pen"] = row["pen_path"]
        if won or round_number >= PHOTO_ROUND:
            files["photo"] = row["image_path"]
        return files

    @staticmethod
    def round_of(row: dict | None) -> tuple[int, bool]:
        """(round, won) of a daily_user_history row: the round is the wrong guesses + 1."""
        if not row:
            return 1, False
        won = bool(row.get("won"))
        guesses = row.get("guesses_count") or len(row.get("guessed_ids") or [])
        return guesses - (1 if won else 0) + 1, won

    def day_number(self, cursor, day: date) -> int | None:
        """Day N of InkIt: its first challenge day is Day 1."""
        cursor.execute("SELECT MIN(pick_date) AS first_day FROM daily_picks WHERE gamemode_id = %s", (INKIT_GAMEMODE_ID,))
        row = cursor.fetchone()
        first = row["first_day"] if row else None
        return (day - first).days + 1 if first and day >= first else None

    def _groups(self, idol: dict) -> list[str]:
        """Her active groups, or her most recent past group when she has none."""
        career = self.repository.fetch_full_idol_career(idol["idol_id"])
        groups = [entry["group_name"] for entry in career if entry.get("is_active")]
        if not groups and idol.get("is_former_group") and idol.get("group_name"):
            groups = [idol["group_name"]]
        return groups

    def _answer(self, answer_id: int) -> tuple[dict, list[str]]:
        idol = dict(self.repository.fetch_full_idol_data(answer_id) or {"idol_id": answer_id})
        groups = self._groups(idol)
        answer = {key: idol.get(key) for key in ("idol_id", "artist_name", "image_path", "image_version")}
        return {**answer, "groups": groups}, groups

    def _history(self, cursor, user_id: int, day: str) -> dict | None:
        cursor.execute(
            """
                SELECT guessed_ids, guesses_count, won FROM daily_user_history
                WHERE user_id = %s AND date = %s AND gamemode_id = %s
            """, (user_id, day, INKIT_GAMEMODE_ID),
        )
        return cursor.fetchone()

    def game_state(self, cursor, user_id: int, day: str, answer_id: int | None = None) -> dict | None:
        """The caller's game of `day`: guesses in order, the drawing of the last guess, hint state
        and, only once won, the answer. None before the first guess."""
        row = self._history(cursor, user_id, day)
        guessed_ids = (row or {}).get("guessed_ids") or []
        if not row or not guessed_ids:
            return None

        if answer_id is None:
            answer_id = GameService(self.db, self.repository).resolve_answer_id(cursor, INKIT_GAMEMODE_ID, day)
        won = bool(row["won"])
        cursor.execute(
            "SELECT id, artist_name, image_path, image_version FROM idols WHERE id = ANY(%s)", (guessed_ids,),
        )
        by_id = {idol["id"]: idol for idol in cursor.fetchall()}
        guesses = [
            {"idol_id": gid, "artist_name": by_id[gid]["artist_name"], "image_path": by_id[gid]["image_path"],
             "image_version": by_id[gid]["image_version"], "correct": won and gid == answer_id}
            for gid in guessed_ids if gid in by_id
        ]

        cursor.execute(
            "SELECT masks, hint_ink_guess FROM inkit_drafts WHERE user_id = %s AND game_date = %s", (user_id, day),
        )
        draft = cursor.fetchone() or {}
        masks = draft.get("masks")

        guesses_count = row["guesses_count"] or len(guessed_ids)
        answer, groups = self._answer(answer_id) if answer_id is not None else (None, [])
        files = self.unlocked_files(cursor, answer_id, *self.round_of(row)) if answer_id is not None else None
        return {
            "files": files,
            "inkit_guesses": guesses,
            "guessed_idols": [guess["artist_name"] for guess in guesses],
            "guesses_count": guesses_count,
            "game_complete": won,
            "game_won": won,
            "game_date": day,
            "hint_ink_guess": draft.get("hint_ink_guess"),
            "draft": base64.b64encode(bytes(masks)).decode("ascii") if masks else None,
            "group_hint": groups if won or guesses_count + 1 >= GROUP_HINT_ROUND else None,
            "answer": answer if won else None,
        }

    def day_payload(self, cursor, user_id: int | None, day: str, answer_id: int) -> dict | None:
        """What the page needs to play `day`: the files its round unlocks (opaque paths), Day N and
        the caller's game. None if the idol has no InkIt row."""
        row = self._history(cursor, user_id, day) if user_id is not None else None
        files = self.unlocked_files(cursor, answer_id, *self.round_of(row))
        if not files:
            return None
        return {
            "files": files,
            "day_number": self.day_number(cursor, date.fromisoformat(day)),
            "game": self.game_state(cursor, user_id, day, answer_id) if user_id is not None else None,
        }

    def save_draft(self, cursor, user_id: int, day: str, blob: bytes) -> None:
        """Overwrite the day's drawing; runs inside the guess transaction (the caller commits)."""
        cursor.execute(
            """
                INSERT INTO inkit_drafts (user_id, game_date, masks, updated_at) VALUES (%s, %s, %s, %s)
                ON CONFLICT (user_id, game_date) DO UPDATE SET masks = EXCLUDED.masks, updated_at = EXCLUDED.updated_at
            """, (user_id, day, blob, utc_now()),
        )

    def process_guess(self, cursor, user_id: int, guessed_id, day: str, draft, analytics_data: dict,
                      is_calendar: bool = False) -> dict:
        """Record one guess with the drawing as it was when the guess was sent. The server owns the
        answer and the attempt count; the answer is returned only with the winning state."""
        if not isinstance(guessed_id, int) or isinstance(guessed_id, bool) or guessed_id <= 0:
            raise InkItError("Missing guessed_idol_id")
        blob = decode_draft(draft)

        game_service = GameService(self.db, self.repository)
        answer_id = game_service.resolve_answer_id(cursor, INKIT_GAMEMODE_ID, day)
        if answer_id is None:
            raise InkItError("Idol data not found")
        guessed = self.repository.fetch_full_idol_data(guessed_id)
        if not guessed:
            raise InkItError("Idol not found", 404)

        def save_drawing(guess_cursor, _attempt):
            if blob is not None:
                self.save_draft(guess_cursor, user_id, day, blob)

        is_correct, card_granted = game_service.save_user_history(
            self.db, cursor, user_id, INKIT_GAMEMODE_ID, guessed_id, {}, answer_id,
            day, get_current_timestamp(), analytics_data, is_calendar=is_calendar, on_recorded=save_drawing,
        )

        row = self._history(cursor, user_id, day) or {}
        won = bool(row.get("won"))
        guesses_count = row.get("guesses_count") or 0
        answer, groups = self._answer(answer_id)
        return {
            # Everything unlocked after this guess, so the page can start loading what it just unlocked.
            "files": self.unlocked_files(cursor, answer_id, *self.round_of(row)),
            "guess_correct": is_correct,
            "guessed_idol_data": {key: guessed.get(key) for key in ("idol_id", "artist_name", "image_path", "image_version")},
            "guesses_count": guesses_count,
            "group_hint": groups if won or guesses_count + 1 >= GROUP_HINT_ROUND else None,
            "answer": answer if won else None,
            "card_granted": card_granted,
        }

    def use_ink_hint(self, cursor, user_id: int, day: str) -> int:
        """Hint 1 "More ink": opt-in, once per game, from round INK_HINT_ROUND. Stores and returns
        the round it was used in; the caller commits."""
        row = self._history(cursor, user_id, day)
        if row and row["won"]:
            raise InkItError("This day is already finished", 409)
        current_round = ((row or {}).get("guesses_count") or 0) + 1
        if current_round < INK_HINT_ROUND:
            raise InkItError("Hint not available yet")

        cursor.execute(
            """
                INSERT INTO inkit_drafts (user_id, game_date, hint_ink_guess, updated_at) VALUES (%s, %s, %s, %s)
                ON CONFLICT (user_id, game_date) DO UPDATE
                    SET hint_ink_guess = EXCLUDED.hint_ink_guess, updated_at = EXCLUDED.updated_at
                    WHERE inkit_drafts.hint_ink_guess IS NULL
                RETURNING hint_ink_guess
            """, (user_id, day, current_round, utc_now()),
        )
        saved = cursor.fetchone()
        if not saved:
            raise InkItError("Hint already used", 409)
        return saved["hint_ink_guess"]
