/* Calendar games (T50): true when the game was finished through the calendar (a past challenge
   day). They count in win stats but never in streaks or ranking. Existing rows stay false. */

BEGIN;

ALTER TABLE daily_user_history ADD COLUMN IF NOT EXISTS is_calendar BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
