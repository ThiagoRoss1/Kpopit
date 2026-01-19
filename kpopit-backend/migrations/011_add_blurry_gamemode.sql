/* Add new gamemode 'blurry' and gamemodes table */

BEGIN TRANSACTION;

PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS gamemodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT 1
);

/* Insert all current gamemodes */
INSERT OR IGNORE INTO gamemodes (name, description, is_active) VALUES
('classic', 'Classic is the standard gamemode where players guess the daily idol based on clues.', 1),
('blurry', 'Blurry mode presents a pixelated image of the idol that gradually becomes clearer with each guess.', 1);

/* Alter daily_picks, yesterday_picks, daily_user_history and user_history to include gamemode_id */
ALTER TABLE daily_picks ADD COLUMN gamemode_id INTEGER DEFAULT 1 REFERENCES gamemodes(id);
ALTER TABLE yesterday_picks ADD COLUMN gamemode_id INTEGER DEFAULT 1 REFERENCES gamemodes(id);
ALTER TABLE daily_user_history ADD COLUMN gamemode_id INTEGER DEFAULT 1 REFERENCES gamemodes(id);
ALTER TABLE user_history ADD COLUMN gamemode_id INTEGER DEFAULT 1 REFERENCES gamemodes(id);

/* Set existing records to classic gamemode */
UPDATE daily_picks SET gamemode_id = (SELECT id FROM gamemodes WHERE name = 'classic');
UPDATE yesterday_picks SET gamemode_id = (SELECT id FROM gamemodes WHERE name = 'classic');
UPDATE daily_user_history SET gamemode_id = (SELECT id FROM gamemodes WHERE name = 'classic');
UPDATE user_history SET gamemode_id = (SELECT id FROM gamemodes WHERE name = 'classic');

/* Create index for gamemode_id columns */
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_user_history_date_gamemode
ON daily_user_history (user_id, date, gamemode_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_history_gamemode
ON user_history (user_id, gamemode_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_picks_date_gamemode
ON daily_picks (pick_date, gamemode_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_yesterday_picks_date_gamemode
ON yesterday_picks (yesterdays_pick_date, gamemode_id);

/* Performance indexes */
CREATE INDEX IF NOT EXISTS idx_daily_picks_gamemode ON daily_picks (gamemode_id);
CREATE INDEX IF NOT EXISTS idx_yesterday_picks_gamemode ON yesterday_picks (gamemode_id);
CREATE INDEX IF NOT EXISTS idx_daily_user_history_gamemode ON daily_user_history (gamemode_id);
CREATE INDEX IF NOT EXISTS idx_user_history_gamemode_single ON user_history (gamemode_id);

PRAGMA foreign_keys=ON;

COMMIT;