BEGIN;

CREATE TABLE IF NOT EXISTS albums (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    soloist_id INTEGER REFERENCES idols(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'album',
    language TEXT,
    release_date DATE NOT NULL,
    cover_path TEXT NOT NULL,
    palette JSONB,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT albums_soloist_check CHECK (
        (group_id = 20 AND soloist_id IS NOT NULL) OR
        (group_id != 20 AND soloist_id IS NULL)
    )
);

-- daily_picks: support album-based gamemodes
ALTER TABLE IF EXISTS daily_picks
    ADD COLUMN IF NOT EXISTS album_id INTEGER REFERENCES albums(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS daily_picks
    ALTER COLUMN idol_id DROP NOT NULL;

-- One of idol_id / album_id must be present
ALTER TABLE IF EXISTS daily_picks
    DROP CONSTRAINT IF EXISTS chk_daily_picks_pick_target;
ALTER TABLE IF EXISTS daily_picks
    ADD CONSTRAINT chk_daily_picks_pick_target
    CHECK (idol_id IS NOT NULL OR album_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_albums_group_id ON albums (group_id);
CREATE INDEX IF NOT EXISTS idx_albums_soloist_id ON albums (soloist_id);
CREATE INDEX IF NOT EXISTS idx_albums_is_published ON albums (is_published);
CREATE INDEX IF NOT EXISTS idx_daily_picks_album_id ON daily_picks (album_id);

COMMIT;
