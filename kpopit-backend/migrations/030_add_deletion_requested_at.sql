/* Account deletion grace period (T45): set when the owner asks to delete the account, cleared by a
   login within 15 days; the daily purge task deletes accounts past that. */

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_deletion_requested_at ON users (deletion_requested_at)
    WHERE deletion_requested_at IS NOT NULL;

COMMIT;
