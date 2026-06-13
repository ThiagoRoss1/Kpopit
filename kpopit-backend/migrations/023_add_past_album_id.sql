BEGIN;

ALTER TABLE yesterday_picks
ADD COLUMN IF NOT EXISTS past_album_id INTEGER REFERENCES albums(id) ON DELETE SET NULL;

ALTER TABLE yesterday_picks
ALTER COLUMN past_idol_id DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_past_id_not_both_null'
    ) THEN
        ALTER TABLE yesterday_picks
        ADD CONSTRAINT chk_past_id_not_both_null
        CHECK (past_idol_id IS NOT NULL OR past_album_id IS NOT NULL);
    END IF;
END $$;

COMMIT;