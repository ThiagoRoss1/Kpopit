--- Add Users --- 

BEGIN TRANSACTION;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users history table

CREATE TABLE IF NOT EXISTS user_history (
    user_id INTEGER PRIMARY KEY,
    current_streak INTEGER DEFAULT 0,
    max_streak INTEGER DEFAULT 0,
    wins_count INTEGER DEFAULT 0,
    average_guesses FLOAT DEFAULT 0.0,
    one_shot_wins INTEGER DEFAULT 0,

    /* Foreign Key */
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Daily history table 

CREATE TABLE IF NOT EXISTS daily_user_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    guesses_count INTEGER DEFAULT 0,
    won BOOLEAN DEFAULT FALSE,
    one_shot_win BOOLEAN DEFAULT FALSE,

    /* Foreign Key */
    FOREIGN KEY (user_id) REFERENCES users(id),

    /* Unique Constraint */
    UNIQUE (user_id, date)
);

COMMIT;