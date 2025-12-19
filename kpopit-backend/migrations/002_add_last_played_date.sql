-- Add last_played_date to user_history

BEGIN TRANSACTION;

ALTER TABLE user_history
ADD COLUMN last_played_date DATE;

COMMIT;