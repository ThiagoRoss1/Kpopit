BEGIN;

CREATE TABLE IF NOT EXISTS user_profiles (
    id           SERIAL PRIMARY KEY NOT NULL,
    user_id      INTEGER NOT NULL UNIQUE,
    display_name TEXT,
    avatar_url   TEXT,
    created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_profiles_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

COMMIT;

-- DOWN
-- DROP TABLE IF EXISTS user_profiles;
