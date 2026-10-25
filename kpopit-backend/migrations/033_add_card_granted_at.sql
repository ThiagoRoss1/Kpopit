/* Collection grants once per win: card_granted_at marks the win (user_id, date, gamemode_id)
   whose Album 1 grant ran, claimed in the grant's own transaction, so a retry or a reconciliation
   never grants or levels twice. Existing wins were granted live or by the launch backfill: mark them. */

BEGIN;

ALTER TABLE daily_user_history ADD COLUMN IF NOT EXISTS card_granted_at TIMESTAMPTZ;

UPDATE daily_user_history
SET card_granted_at = COALESCE(won_at, CURRENT_TIMESTAMP)
WHERE won = TRUE AND gamemode_id IN (1, 2) AND card_granted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_daily_user_history_card_pending
    ON daily_user_history (user_id, date) WHERE won = TRUE AND card_granted_at IS NULL;

COMMIT;
