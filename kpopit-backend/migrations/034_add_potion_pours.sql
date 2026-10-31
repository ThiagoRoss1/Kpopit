/* Idol XP potion spending: each pour moves potion XP into one idol. The balance and the idol's
   total stay computed from history (games + pours); nothing else is stored. */

BEGIN;

CREATE TABLE IF NOT EXISTS potion_pours (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idol_id INTEGER NOT NULL REFERENCES idols(id),
    amount INTEGER NOT NULL,
    poured_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_potion_pours_amount CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_potion_pours_user_id ON potion_pours (user_id, poured_at);

COMMIT;
