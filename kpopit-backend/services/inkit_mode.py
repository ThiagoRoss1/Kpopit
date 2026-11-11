"""InkIt (gamemode 4) constants shared by the services; nothing here imports another service."""
import os
from utils.env import load_local_env

load_local_env()

# Off by default: without the flag the /api/game/inkit routes aren't registered and no other
# endpoint (calendar, restore, profile stats, features) knows the mode.
INKIT_ENABLED = os.getenv("INKIT_ENABLED", "false").lower() == "true"

INKIT_GAMEMODE_ID = 4
INKIT_MODE = {"inkit": INKIT_GAMEMODE_ID} if INKIT_ENABLED else {}

# Rounds: round N is the Nth guess being made (1 + guesses already recorded).
INK_HINT_ROUND = 5
GROUP_HINT_ROUND = 8

# Drawing blob: 1 version byte + zlib deflate of three 250x250 masks at 4 bits per value.
DRAFT_VERSION = 1
DRAFT_MASK_SIDE = 250
DRAFT_RAW_LENGTH = 3 * DRAFT_MASK_SIDE * DRAFT_MASK_SIDE // 2
DRAFT_MAX_BYTES = 32 * 1024
DRAFT_KEEP_DAYS = 2

# Placeholder photos while data/inkit_idols.csv is empty: every Blurry photo without an InkIt row
# gets one, under an opaque path (new rows only).
SEED_PHOTOS_FROM_BLURRY_SQL = """
    INSERT INTO inkit_mode_data (idol_id, image_path, is_active)
    SELECT b.idol_id, '/images/inkit/' || replace(gen_random_uuid()::text, '-', '') || '.webp', COALESCE(b.is_active, TRUE)
    FROM blurry_mode_data b
    ON CONFLICT (idol_id) DO NOTHING
"""
