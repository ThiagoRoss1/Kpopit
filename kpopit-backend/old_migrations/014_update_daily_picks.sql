/* Update daily_picks table */

BEGIN TRANSACTION;

PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS daily_picks_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pick_date DATE NOT NULL,
    idol_id INTEGER NOT NULL,
    gamemode_id INTEGER NOT NULL DEFAULT 1,

    /* --- Foreign Key --- */
    FOREIGN KEY(idol_id) REFERENCES idols(id),
    FOREIGN KEY(gamemode_id) REFERENCES gamemodes(id),

    /* --- Unique Constraints --- */
    UNIQUE(pick_date, gamemode_id)
);

INSERT INTO daily_picks_new (pick_date, idol_id, gamemode_id)
SELECT pick_date, idol_id, gamemode_id FROM daily_picks;

DROP TABLE daily_picks;
ALTER TABLE daily_picks_new RENAME TO daily_picks;

CREATE INDEX IF NOT EXISTS idx_daily_picks_idol_gamemode_date ON daily_picks (idol_id, gamemode_id, pick_date);
CREATE INDEX IF NOT EXISTS idx_daily_picks_gamemode ON daily_picks (gamemode_id);

PRAGMA foreign_keys=ON;

COMMIT;