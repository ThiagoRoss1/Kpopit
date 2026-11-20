/* InkIt drawing of a game: one row per user and challenge day, overwritten on every guess (never
   per stroke). masks = format version byte + deflate of the three tool masks; kept after the win
   for "Share my drawing" and deleted by the daily draw once updated_at is 2 days old. */

BEGIN;

CREATE TABLE IF NOT EXISTS inkit_drafts (
    user_id INTEGER NOT NULL,
    game_date DATE NOT NULL,
    masks BYTEA,
    hint_ink_guess SMALLINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_inkit_drafts PRIMARY KEY (user_id, game_date),
    CONSTRAINT fk_inkit_drafts_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_inkit_drafts_masks_size CHECK (masks IS NULL OR octet_length(masks) <= 32768),
    CONSTRAINT chk_inkit_drafts_hint_ink_guess CHECK (hint_ink_guess IS NULL OR hint_ink_guess >= 5)
);

-- Already deflated: skip TOAST compression and keep the bytes out of line.
ALTER TABLE inkit_drafts ALTER COLUMN masks SET STORAGE EXTERNAL;

CREATE INDEX IF NOT EXISTS idx_inkit_drafts_updated_at ON inkit_drafts (updated_at);

COMMIT;
