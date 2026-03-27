-- Add won_at column to the daily_user_history table

BEGIN;

ALTER TABLE daily_user_history ADD COLUMN won_at TIMESTAMPTZ;

COMMIT;