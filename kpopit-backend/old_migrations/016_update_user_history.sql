/* Update user_history_table */

BEGIN TRANSACTION;

PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS user_history_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    wins_count INTEGER DEFAULT 0,
    average_guesses FLOAT DEFAULT 0.0,
    one_shot_wins INTEGER DEFAULT 0,
    last_played_date DATE,
    gamemode_id INTEGER NOT NULL DEFAULT 1,

    /* Foreign Key */
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (gamemode_id) REFERENCES gamemodes(id),

    /* Unique Constraint */
    UNIQUE (user_id, gamemode_id)
);

INSERT INTO user_history_new (user_id, current_streak, max_streak, wins_count, average_guesses, one_shot_wins, last_played_date, gamemode_id)
SELECT user_id, current_streak, max_streak, wins_count, average_guesses, one_shot_wins, last_played_date, COALESCE(gamemode_id, 1) FROM user_history;

DROP TABLE user_history;
ALTER TABLE user_history_new RENAME TO user_history;

PRAGMA foreign_keys=ON;

COMMIT;