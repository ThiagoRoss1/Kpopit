/* Idol XP (T53): which idol a player had selected and when. selected_to is NULL for the current
   selection; the partial unique index allows at most one per user. XP itself is never stored. */

BEGIN;

CREATE TABLE IF NOT EXISTS idol_selections (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idol_id INTEGER NOT NULL REFERENCES idols(id),
    selected_from TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    selected_to TIMESTAMPTZ,

    CONSTRAINT chk_idol_selections_range CHECK (selected_to IS NULL OR selected_to >= selected_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_idol_selections_current ON idol_selections (user_id) WHERE selected_to IS NULL;
CREATE INDEX IF NOT EXISTS idx_idol_selections_user_id ON idol_selections (user_id, selected_from);

COMMIT;
