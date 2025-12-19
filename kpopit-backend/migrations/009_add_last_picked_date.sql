/* Add last_picked_date column to idols table */

BEGIN TRANSACTION;

ALTER TABLE idols ADD COLUMN last_picked_date DATETIME DEFAULT NULL;

COMMIT;