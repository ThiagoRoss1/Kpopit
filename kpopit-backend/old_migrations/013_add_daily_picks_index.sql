/* Create daily_picks index for faster lookups */

BEGIN TRANSACTION;

PRAGMA foreign_keys=OFF;

CREATE INDEX IF NOT EXISTS idx_daily_picks_idol_gamemode_date ON daily_picks (idol_id, gamemode_id, pick_date); 

PRAGMA foreign_keys=ON;

COMMIT;