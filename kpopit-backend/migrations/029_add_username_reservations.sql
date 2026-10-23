/* Username reservations (T44): after a rename the old name stays held by its owner until
   reserved_until (15 days), so nobody else can take it and /profile/<old> can redirect. */

BEGIN;

CREATE TABLE IF NOT EXISTS username_reservations (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reserved_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_username_reservations_lower ON username_reservations (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_username_reservations_user_id ON username_reservations (user_id);

COMMIT;
