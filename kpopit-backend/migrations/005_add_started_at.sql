-- Add started_at column to the daily_user_history table

BEGIN TRANSACTION;

ALTER TABLE daily_user_history ADD COLUMN started_at DATETIME;

COMMIT;