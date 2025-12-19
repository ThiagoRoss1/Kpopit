/* Add game_state column to daily_user_history table */

BEGIN TRANSACTION;

ALTER TABLE daily_user_history ADD COLUMN game_state TEXT DEFAULT NULL;

COMMIT;