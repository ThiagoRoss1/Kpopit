/* Update daily_user_history table */

BEGIN TRANSACTION;

PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS daily_user_history_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    guesses_count INTEGER DEFAULT 0,
    won BOOLEAN DEFAULT FALSE,
    one_shot_win BOOLEAN DEFAULT FALSE,
    won_at DATETIME,
    started_at DATETIME,
    score REAL DEFAULT 0,
    game_state TEXT DEFAULT NULL,
    gamemode_id INTEGER NOT NULL DEFAULT 1,

    /* Foreign Key */
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (gamemode_id) REFERENCES gamemodes(id),

    /* Unique Constraint */
    UNIQUE (user_id, date, gamemode_id)
);

INSERT INTO daily_user_history_new (user_id, date, guesses_count, won, one_shot_win, won_at, started_at, score, game_state, gamemode_id)
SELECT user_id, date, guesses_count, won, one_shot_win, won_at, started_at, score, game_state, COALESCE(gamemode_id, 1) FROM daily_user_history;

DROP TABLE daily_user_history;
ALTER TABLE daily_user_history_new RENAME TO daily_user_history;

PRAGMA foreign_keys=ON;

COMMIT;