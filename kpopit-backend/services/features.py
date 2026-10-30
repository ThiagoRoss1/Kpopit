"""Feature flags the frontend may know about (GET /api/features). One line per flag.

Values are the flags the backend already reads at import; only booleans, never secrets.
"""
import services.calendar_service as calendar_service
import services.collections_service as collections_service
import services.profile_service as profile_service
import services.xp_service as xp_service

_FLAGS = {
    "calendar": lambda: calendar_service.CALENDAR_ENABLED,
    "idol_xp": lambda: xp_service.IDOL_XP_ENABLED,
    "public_profile": lambda: profile_service.PUBLIC_PROFILE_ENABLED,
    "collection": lambda: collections_service.COLLECTION_ENABLED,
}


def public_features() -> dict[str, bool]:
    return {name: bool(read()) for name, read in _FLAGS.items()}
