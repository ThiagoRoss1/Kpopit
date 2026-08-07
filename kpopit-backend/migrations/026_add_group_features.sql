BEGIN;

CREATE TABLE IF NOT EXISTS group_features (
    group_id INTEGER PRIMARY KEY REFERENCES groups(id),
    image_path TEXT,
    palette JSONB,
    image_version TEXT DEFAULT '1'
);

ALTER TABLE groups ADD COLUMN IF NOT EXISTS hangul_name TEXT;

DROP INDEX IF EXISTS idx_user_cards_user_id;

COMMIT;