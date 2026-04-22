BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username         TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS password_hash    TEXT,
    ADD COLUMN IF NOT EXISTS email            TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS email_verified   BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS google_id        TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS is_authenticated BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_admin         BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_login_at    TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_email_lower    ON users (LOWER(email));

COMMIT;

-- DOWN
-- ALTER TABLE users
--     DROP COLUMN IF EXISTS username,
--     DROP COLUMN IF EXISTS password_hash,
--     DROP COLUMN IF EXISTS email,
--     DROP COLUMN IF EXISTS email_verified,
--     DROP COLUMN IF EXISTS google_id,
--     DROP COLUMN IF EXISTS is_authenticated,
--     DROP COLUMN IF EXISTS is_admin,
--     DROP COLUMN IF EXISTS last_login_at;
-- DROP INDEX IF EXISTS idx_users_username_lower;
-- DROP INDEX IF EXISTS idx_users_email_lower;
