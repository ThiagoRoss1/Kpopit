/* Add transfer_data table to store transfer codes for user data migration */

BEGIN;

CREATE TABLE IF NOT EXISTS transfer_data (
    id SERIAL PRIMARY KEY NOT NULL,
    code TEXT UNIQUE NOT NULL,
    user_token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,

    /* Foreign Key */
    CONSTRAINT fk_transfer_user_token FOREIGN KEY (user_token) REFERENCES users(token)
);

CREATE INDEX IF NOT EXISTS idx_transfer_data_codes ON transfer_data(code);
CREATE INDEX IF NOT EXISTS idx_transfer_data_codes_expires_at ON transfer_data(expires_at);

COMMIT;