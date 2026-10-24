/* Server-recorded guesses: ids in guess order + where they came from.
   Old rows stay NULL until the history backfill fills them as 'backfill'; defaults only apply to new rows. */

BEGIN;

ALTER TABLE daily_user_history
    ADD COLUMN IF NOT EXISTS guessed_ids INTEGER[],
    ADD COLUMN IF NOT EXISTS guesses_origin TEXT;

ALTER TABLE daily_user_history
    ALTER COLUMN guessed_ids SET DEFAULT '{}',
    ALTER COLUMN guesses_origin SET DEFAULT 'live';

ALTER TABLE daily_user_history DROP CONSTRAINT IF EXISTS chk_daily_user_history_guesses_origin;
ALTER TABLE daily_user_history
    ADD CONSTRAINT chk_daily_user_history_guesses_origin CHECK (guesses_origin IN ('live', 'backfill'));

COMMIT;
