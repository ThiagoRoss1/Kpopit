"""Per-file opaque paths for the InkIt photo, pencil and pen: one HMAC-SHA256 hash of the
NFC-normalised, lower-cased stem and the kind each, so no path reveals or derives another.
The key (INKIT_PATH_SECRET) exists only on the owner's machine and in the test runners, never
on Railway: production only reads the paths already stored in the database.
"""

import hashlib
import hmac
import unicodedata

KINDS = ("photo", "pencil", "pen")

_PREFIXES = {
    "photo": "/images/inkit/",
    "pencil": "/images/inkit/pencil/",
    "pen": "/images/inkit/pen/",
}


def opaque_path(stem: str, kind: str, secret: str) -> str:
    """The stored path for one file: `/images/inkit[/pencil|/pen]/<32 hex>.webp`."""
    if not secret:
        raise ValueError("INKIT_PATH_SECRET is required to compute InkIt paths")
    if kind not in _PREFIXES:
        raise ValueError(f"Unknown InkIt layer kind: {kind!r}")
    message = f"{unicodedata.normalize('NFC', stem).lower()}:{kind}"
    digest = hmac.new(secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()[:32]
    return f"{_PREFIXES[kind]}{digest}.webp"
