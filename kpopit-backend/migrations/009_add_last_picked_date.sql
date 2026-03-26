/* Add last_picked_date column to idols table */

BEGIN;

ALTER TABLE idols ADD COLUMN last_picked_date DATE DEFAULT NULL;

COMMIT;