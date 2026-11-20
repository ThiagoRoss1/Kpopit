"""Draw-time check that an InkIt idol's photo, pencil and pen files exist on the public bucket.
Fails open on network trouble so a day is never left without a pick; logs never name a path."""

import logging
import os
import urllib.error
import urllib.request

logger = logging.getLogger(__name__)

# Cloudflare answers 403 to urllib's default User-Agent ("Python-urllib/x.y").
USER_AGENT = "kpopit-inkit-check/1.0"
TIMEOUT_SECONDS = 3


def files_present(paths: list[str]) -> bool:
    """False when the bucket answers 404/403 for any path; True otherwise (or with no bucket URL)."""
    base = os.getenv("R2_PUBLIC_URL", "").rstrip("/")
    if not base:
        return True

    for path in paths:
        request = urllib.request.Request(f"{base}{path}", method="HEAD", headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS):
                pass
        except urllib.error.HTTPError as err:
            if err.code in (403, 404):
                return False
            logger.warning("InkIt file check unavailable (%s)", err.code)
            return True
        except (urllib.error.URLError, OSError) as err:
            logger.warning("InkIt file check unavailable (%s)", type(err).__name__)
            return True
    return True
