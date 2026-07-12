BEGIN;

ALTER TABLE groups ADD COLUMN IF NOT EXISTS image_path TEXT;

DROP INDEX IF EXISTS idx_user_cards_user_id;

COMMIT;
