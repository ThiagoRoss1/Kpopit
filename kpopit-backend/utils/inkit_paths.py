"""Per-file opaque paths for the InkIt layers.

Each of a photo's three files (photo, pencil, pen) gets its own HMAC-SHA256 hash of
the readable stem and the kind, so the pencil URL a player sees at round 1 reveals
nothing about the pen or the photo. The hash is stable across case and accents
(computed on the NFC-normalised, lower-cased stem), so `Rosé_i` and `ROSE_I`-style
spellings map to the same keys. No path is ever derived from another.

The HMAC key is `INKIT_PATH_SECRET`, which exists only on the owner's machine and in
the test runners — never on Railway. Production only reads paths already stored in the
database and never computes one.
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
