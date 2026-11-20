import logging
import os
import urllib.error
import urllib.request
from flask import Blueprint, Response, g, jsonify, request
from flask_limiter.util import get_remote_address
from services.calendar_service import CALENDAR_ENABLED, CalendarError, CalendarService
from services.daily_draw import ensure_daily_picks
from services.game_service import GameService
from services.get_db import get_db, get_idol_repo
from services.inkit_mode import INK_HINT_ROUND, INKIT_GAMEMODE_ID
from services.inkit_service import InkItError, InkItService
from services.user_service import UserService
from utils.analytics import get_analytics_data, get_country_name
from utils.auth_decorators import optional_auth
from utils.auth_helpers import detect_user
from utils.dates import get_today_date_str
from utils.rate_limiter import limiter

inkit_bp = Blueprint("inkit", __name__)

logger = logging.getLogger(__name__)

# A guess carries the drawing (at most 32 KB, base64) plus a few small fields.
MAX_GUESS_BODY_BYTES = 64 * 1024

FLASK_ENV = os.getenv("FLASK_ENV", "production").lower()


def _caller_id(cursor, required: bool = True):
    """(user_id, None) for a logged-in or anonymous caller, else (None, error response).
    With required=False a request without identity is (None, None)."""
    auth = g.auth
    if auth["source"] == "jwt":
        return auth["user_id"], None
    if auth["source"] != "anonymous":
        return None, ((jsonify({"error": "Missing user token"}), 400) if required else None)
    cursor.execute("SELECT id FROM users WHERE token = %s", (auth["token"],))
    row = cursor.fetchone()
    if not row:
        return None, (jsonify({"error": "Invalid user token"}), 400)
    return row["id"], None


def _json_body():
    """The request's JSON object, or None when it is too large or not an object."""
    if (request.content_length or 0) > MAX_GUESS_BODY_BYTES:
        return None
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


@inkit_bp.route("/game/inkit/daily", methods=["GET"])
@optional_auth
def get_daily_inkit():
    """Today's photo (opaque path), Day N and the caller's game. Never the answer before the win."""
    connect = get_db()
    cursor = connect.cursor()

    try:
        # Today's idol (tomorrow's is drawn ahead and never returned)
        idol_id = ensure_daily_picks(cursor, gamemode_id=INKIT_GAMEMODE_ID)
        connect.commit()

        # For testing purposes, we can override the idol_id here
        # idol_id = 1

        if idol_id is None:
            return jsonify({"error": "Idol not found"}), 404

        user_id, error = _caller_id(cursor, required=False)
        if error:
            return error
        if user_id is not None:
            UserService(connect).handle_user_streak(gamemode_id=INKIT_GAMEMODE_ID)

        today = get_today_date_str()
        payload = InkItService(connect, get_idol_repo()).day_payload(cursor, user_id, today, idol_id)
        if not payload:
            return jsonify({"error": "Idol not found"}), 404

        response = jsonify({**payload, "server_date": today})
        # Holds one player's game: never shared between callers by a cache.
        response.headers["Cache-Control"] = "private, no-store"
        return response, 200

    finally:
        cursor.close()


@inkit_bp.route("/game/inkit/guess", methods=["POST"])
@optional_auth
def guess_inkit_idol():
    """One guess plus the drawing it was made with; the server owns the answer and the count."""
    data = _json_body()
    if data is None:
        return jsonify({"error": "Invalid request"}), 400

    analytics_data = get_analytics_data() or {}
    country_name, flag = get_country_name(analytics_data.get("country"))
    analytics_data["country"] = f"{country_name} {flag}"

    connect = get_db()
    cursor = connect.cursor()

    try:
        today = get_today_date_str()
        if data.get("game_date") != today:
            return jsonify({"error": "Game date mismatch"}), 400

        user_id, error = _caller_id(cursor)
        if error or user_id is None:
            return error or (jsonify({"error": "Missing user token"}), 400)

        result = InkItService(connect, get_idol_repo()).process_guess(
            cursor, user_id, data.get("guessed_idol_id"), today, data.get("draft"), analytics_data,
        )
        return jsonify(result), 200

    except InkItError as err:
        connect.rollback()
        return jsonify({"error": str(err)}), err.status

    except Exception:
        connect.rollback()
        logger.exception("Error processing %s guess", "inkit")
        return jsonify({"error": "Could not process the guess"}), 500

    finally:
        cursor.close()


@inkit_bp.route("/game/inkit/hint", methods=["POST"])
@optional_auth
def use_inkit_ink_hint():
    """Hint 1 "More ink" for today, or for a past challenge day while the calendar is on."""
    data = _json_body()
    if data is None:
        return jsonify({"error": "Invalid request"}), 400

    connect = get_db()
    cursor = connect.cursor()

    try:
        today = get_today_date_str()
        day = data.get("game_date")
        if not isinstance(day, str):
            return jsonify({"error": "Game date mismatch"}), 400

        if day != today:
            if not CALENDAR_ENABLED:
                return jsonify({"error": "Game date mismatch"}), 400
            day = CalendarService(connect, get_idol_repo()).challenge_day(cursor, INKIT_GAMEMODE_ID, day)

        user_id, error = _caller_id(cursor)
        if error or user_id is None:
            return error or (jsonify({"error": "Missing user token"}), 400)

        used_round = InkItService(connect, get_idol_repo()).use_ink_hint(cursor, user_id, day)
        connect.commit()
        return jsonify({"hint_ink_guess": used_round, "unlock_round": INK_HINT_ROUND}), 200

    except (InkItError, CalendarError) as err:
        connect.rollback()
        return jsonify({"error": str(err)}), err.status

    except Exception:
        connect.rollback()
        logger.exception("Error saving the InkIt ink hint")
        return jsonify({"error": "Could not use the hint"}), 500

    finally:
        cursor.close()


def _fallback_game_date() -> str:
    data = request.get_json(silent=True)
    day = data.get("date") if isinstance(data, dict) else None
    return day if isinstance(day, str) and day else get_today_date_str()


def _fallback_limit_key() -> str:
    """One allowance per caller and game date: a calendar day never spends today's."""
    auth = detect_user(request)
    who = auth.get("user_id") if auth["source"] == "jwt" else auth.get("token") if auth["source"] == "anonymous" else None
    return f"{who or get_remote_address()}:{_fallback_game_date()}"


@inkit_bp.route("/game/inkit/fallback-photo", methods=["POST"])
@limiter.limit("2 per day", key_func=_fallback_limit_key)
@optional_auth
def inkit_fallback_photo():
    """Emergency only: the photo path, so a page whose layers failed to load can build them in the
    browser. For an identified caller and a real challenge day (today, or a past day through the
    calendar), never tomorrow. Logged without the idol or the path."""
    connect = get_db()
    cursor = connect.cursor()

    try:
        user_id, error = _caller_id(cursor)
        if error or user_id is None:
            return error or (jsonify({"error": "Missing user token"}), 400)

        today = get_today_date_str()
        day = _fallback_game_date()
        if day != today:
            if not CALENDAR_ENABLED:
                return jsonify({"error": "Not found"}), 404
            try:
                day = CalendarService(connect, get_idol_repo()).challenge_day(cursor, INKIT_GAMEMODE_ID, day)
            except CalendarError:
                return jsonify({"error": "Not found"}), 404

        answer_id = GameService(connect, get_idol_repo()).resolve_answer_id(cursor, INKIT_GAMEMODE_ID, day)
        photo = InkItService(connect, get_idol_repo()).photo(cursor, answer_id) if answer_id is not None else None
        if not photo:
            return jsonify({"error": "Not found"}), 404

        logger.info("InkIt fallback photo served")
        response = jsonify({"photo": photo["image_path"], "version": photo["image_version"]})
        response.headers["Cache-Control"] = "private, no-store"
        return response, 200

    finally:
        cursor.close()


if FLASK_ENV == "development":
    R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL", "").rstrip("/")

    def _dev_sources(cursor, path: str) -> list[str]:
        """The bucket URLs to try for a stored InkIt path, in order; empty for any other path. A photo
        tries its uploaded file (the crop the layers were drawn from), then the Blurry photo, which
        only stands in before the upload (the fallback layers are then built from it too)."""
        cursor.execute(
            """
                SELECT m.image_path, m.pencil_path, m.pen_path, m.image_version,
                       b.blur_image_path, b.blur_image_version
                FROM inkit_mode_data m LEFT JOIN blurry_mode_data b ON b.idol_id = m.idol_id
                WHERE %(path)s IN (m.image_path, m.pencil_path, m.pen_path)
            """, {"path": path},
        )
        row = cursor.fetchone()
        if not row or not path:
            return []
        sources = [f"{R2_PUBLIC_URL}{path}?v={row['image_version']}"]
        if path == row["image_path"] and row["blur_image_path"]:
            sources.append(f"{R2_PUBLIC_URL}/{row['blur_image_path'].lstrip('/')}?v={row['blur_image_version']}")
        return sources

    def _fetch(source: str) -> tuple[bytes, str]:
        # Cloudflare answers 403 to urllib's default User-Agent ("Python-urllib/x.y").
        fetch = urllib.request.Request(source, headers={"User-Agent": "kpopit-dev-photo/1.0"})
        with urllib.request.urlopen(fetch, timeout=10) as upstream:
            return upstream.read(), upstream.headers.get_content_type()

    @inkit_bp.route("/game/inkit/dev/file", methods=["GET"])
    def dev_file():
        """Development only: streams a stored InkIt file (photo, pencil or pen) from the public bucket
        at R2_PUBLIC_URL. The bytes come through here, so the browser never sees a readable name."""
        if not R2_PUBLIC_URL:
            return jsonify({"error": "Set R2_PUBLIC_URL to load InkIt files locally"}), 503

        connect = get_db()
        cursor = connect.cursor()
        try:
            sources = _dev_sources(cursor, request.args.get("path", ""))
        finally:
            cursor.close()
        if not sources:
            return jsonify({"error": "Not found"}), 404

        for index, source in enumerate(sources):
            try:
                body, mimetype = _fetch(source)
                break
            except urllib.error.HTTPError as err:
                if err.code == 404 and index < len(sources) - 1:
                    continue
                # A layer that isn't uploaded is a 404, so the page falls back to building the layers.
                logger.warning("Could not fetch the InkIt dev file from the public bucket (%s)", err.code)
                return jsonify({"error": "Could not load the file"}), 404 if err.code == 404 else 502
            except (urllib.error.URLError, OSError) as err:
                # The error type only: the URL would name the idol.
                logger.warning("Could not fetch the InkIt dev file from the public bucket (%s)", type(err).__name__)
                return jsonify({"error": "Could not load the file"}), 502
        else:
            return jsonify({"error": "Not found"}), 404

        response = Response(body, mimetype=mimetype)
        response.headers["Cache-Control"] = "private, max-age=3600"
        return response
