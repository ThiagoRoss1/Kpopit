import logging
import os
import urllib.error
import urllib.request
from flask import Blueprint, Response, g, jsonify, request
from services.calendar_service import CALENDAR_ENABLED, CalendarError, CalendarService
from services.daily_draw import ensure_daily_picks
from services.get_db import get_db, get_idol_repo
from services.inkit_mode import INK_HINT_ROUND, INKIT_GAMEMODE_ID
from services.inkit_service import InkItError, InkItService
from services.user_service import UserService
from utils.analytics import get_analytics_data, get_country_name
from utils.auth_decorators import optional_auth
from utils.dates import get_today_date_str

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


if FLASK_ENV == "development":
    R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL", "").rstrip("/")

    def _dev_source(cursor, path: str) -> str | None:
        """The bucket URL behind a stored InkIt path, or None for any other path. The hashed photo
        may not be uploaded yet, so a photo path streams the idol's Blurry photo instead."""
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
            return None
        if path == row["image_path"]:
            if not row["blur_image_path"]:
                return None
            return f"{R2_PUBLIC_URL}/{row['blur_image_path'].lstrip('/')}?v={row['blur_image_version']}"
        return f"{R2_PUBLIC_URL}{path}?v={row['image_version']}"

    @inkit_bp.route("/game/inkit/dev/file", methods=["GET"])
    def dev_file():
        """Development only: streams a stored InkIt file (photo, pencil or pen) from the public bucket
        at R2_PUBLIC_URL. The bytes come through here, so the browser never sees a readable name."""
        if not R2_PUBLIC_URL:
            return jsonify({"error": "Set R2_PUBLIC_URL to load InkIt files locally"}), 503

        connect = get_db()
        cursor = connect.cursor()
        try:
            source = _dev_source(cursor, request.args.get("path", ""))
        finally:
            cursor.close()
        if not source:
            return jsonify({"error": "Not found"}), 404

        try:
            # Cloudflare answers 403 to urllib's default User-Agent ("Python-urllib/x.y").
            fetch = urllib.request.Request(source, headers={"User-Agent": "kpopit-dev-photo/1.0"})
            with urllib.request.urlopen(fetch, timeout=10) as upstream:
                body, mimetype = upstream.read(), upstream.headers.get_content_type()
        except urllib.error.HTTPError as err:
            # A layer that isn't uploaded is a 404, so the page falls back to building the layers.
            logger.warning("Could not fetch the InkIt dev file from the public bucket (%s)", err.code)
            return jsonify({"error": "Could not load the file"}), 404 if err.code == 404 else 502
        except (urllib.error.URLError, OSError) as err:
            # The error type only: the URL would name the idol.
            logger.warning("Could not fetch the InkIt dev file from the public bucket (%s)", type(err).__name__)
            return jsonify({"error": "Could not load the file"}), 502

        response = Response(body, mimetype=mimetype)
        response.headers["Cache-Control"] = "private, max-age=3600"
        return response
