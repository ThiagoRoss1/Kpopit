-- Add started_at column to the daily_user_history table

BEGIN;

ALTER TABLE daily_user_history ADD COLUMN started_at TIMESTAMPTZ;

COMMIT;