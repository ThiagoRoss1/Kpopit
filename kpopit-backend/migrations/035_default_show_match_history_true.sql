/* Public profiles show match history by default (with server-side anti-spoiler). Only the
   default changes, for accounts created from now on; existing rows keep their value. */

BEGIN;

ALTER TABLE user_profiles ALTER COLUMN show_match_history SET DEFAULT TRUE;

COMMIT;
