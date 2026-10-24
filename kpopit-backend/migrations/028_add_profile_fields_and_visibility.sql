/* Profile fields + visibility. Each toggle is added with the value existing accounts get
   (private), then its default switches to what new accounts get: public, match history private. */

BEGIN;

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS bias_idol_id INTEGER REFERENCES idols(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS bias_group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS show_match_history BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS show_calendar BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE user_profiles
    ALTER COLUMN is_public SET DEFAULT TRUE,
    ALTER COLUMN show_calendar SET DEFAULT TRUE;

COMMIT;
