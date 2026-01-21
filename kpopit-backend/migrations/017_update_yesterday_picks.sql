/* Update yesterday_picks table */

BEGIN TRANSACTION;

PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS yesterday_picks_new (
        past_idol_id INTEGER NOT NULL,
        yesterdays_pick_date DATE NOT NULL,
        gamemode_id INTEGER NOT NULL DEFAULT 1,

        /* --- Primary Key --- */
        PRIMARY KEY (yesterdays_pick_date, gamemode_id),

        /* --- Foreign Key --- */
        FOREIGN KEY(past_idol_id) REFERENCES idols(id),
        FOREIGN KEY(gamemode_id) REFERENCES gamemodes(id)
);

INSERT INTO yesterday_picks_new (past_idol_id, yesterdays_pick_date, gamemode_id)
SELECT past_idol_id, yesterdays_pick_date, COALESCE(gamemode_id, 1) FROM yesterday_picks;

DROP TABLE yesterday_picks;
ALTER TABLE yesterday_picks_new RENAME TO yesterday_picks;

CREATE UNIQUE INDEX IF NOT EXISTS idx_yesterday_picks_date_gamemode
ON yesterday_picks (yesterdays_pick_date, gamemode_id);

CREATE INDEX IF NOT EXISTS idx_yesterday_picks_gamemode ON yesterday_picks (gamemode_id);

PRAGMA foreign_keys=ON;

COMMIT;