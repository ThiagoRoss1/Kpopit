"""InkIt (gamemode 4) constants shared by the services; nothing here imports another service."""
import os
from utils.env import load_local_env

load_local_env()

# Off by default: without the flag the /api/game/inkit routes aren't registered and no other
# endpoint (calendar, restore, profile stats, features) knows the mode.
INKIT_ENABLED = os.getenv("INKIT_ENABLED", "false").lower() == "true"

INKIT_GAMEMODE_ID = 4
INKIT_MODE = {"inkit": INKIT_GAMEMODE_ID} if INKIT_ENABLED else {}

# Rounds: round N is the Nth guess being made (wrong guesses + 1). Same numbers as INKIT_CONFIG in
# kpopit-frontend/src/features/inkit/config.ts (test_inkit checks both sides agree).
INK_HINT_ROUND = 5
GROUP_HINT_ROUND = 8
# Files by round: the pen layer is sent from the round the pen unlocks, the photo from the paint
# round or the win (unlockRound in config.ts). The pencil is always sent.
PEN_ROUND = 3
PHOTO_ROUND = 5

# Drawing: zlib deflate of [version byte, three 250x250 masks at 4 bits per value], as base64.
DRAFT_VERSION = 1
DRAFT_MASK_SIDE = 250
DRAFT_RAW_LENGTH = 1 + 3 * DRAFT_MASK_SIDE * DRAFT_MASK_SIDE // 2
DRAFT_MAX_BYTES = 32 * 1024
DRAFT_KEEP_DAYS = 2

# Placeholder photos while data/inkit_idols.csv is empty: every Blurry photo without an InkIt row
# gets one, with opaque photo/pencil/pen paths (new rows only).
SEED_PHOTOS_FROM_BLURRY_SQL = """
    INSERT INTO inkit_mode_data (idol_id, image_path, pencil_path, pen_path, is_active)
    SELECT b.idol_id,
           '/images/inkit/' || replace(gen_random_uuid()::text, '-', '') || '.webp',
           '/images/inkit/pencil/' || replace(gen_random_uuid()::text, '-', '') || '.webp',
           '/images/inkit/pen/' || replace(gen_random_uuid()::text, '-', '') || '.webp',
           COALESCE(b.is_active, TRUE)
    FROM blurry_mode_data b
    ON CONFLICT (idol_id) DO NOTHING
"""
