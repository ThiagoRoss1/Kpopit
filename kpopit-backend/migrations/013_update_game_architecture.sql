/* Update game architecture to support multiple gamemodes */

/* Update daily_picks table */

PRAGMA foreign_keys=OFF;

BEGIN TRANSACTION;

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
SELECT pick_date, idol_id, COALESCE(gamemode_id, 1) FROM daily_picks;

DROP TABLE daily_picks;
ALTER TABLE daily_picks_new RENAME TO daily_picks;

CREATE INDEX IF NOT EXISTS idx_daily_picks_idol_gamemode_date ON daily_picks (idol_id, gamemode_id, pick_date);
CREATE INDEX IF NOT EXISTS idx_daily_picks_gamemode ON daily_picks (gamemode_id);

/* Update daily_user_history table */

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

/* Update user_history_table */

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

/* Update yesterday_picks table */

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

COMMIT;

PRAGMA foreign_keys=ON;

PRAGMA foreign_key_check;