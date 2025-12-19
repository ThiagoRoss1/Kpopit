-- Add score column to daily_user_history and user_history tables

BEGIN TRANSACTION;

ALTER TABLE daily_user_history ADD COLUMN score REAL DEFAULT 0;

COMMIT;