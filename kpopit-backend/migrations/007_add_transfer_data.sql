/* Add transfer_data table to store transfer codes for user data migration */

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS transfer_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    user_token TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at DATETIME,

    /* Foreign Key */
    FOREIGN KEY (user_token) REFERENCES users(token)
);

CREATE INDEX idx_transfer_data_codes ON transfer_data(code);
CREATE INDEX idx_transfer_data_codes_expires_at ON transfer_data(expires_at);

COMMIT;