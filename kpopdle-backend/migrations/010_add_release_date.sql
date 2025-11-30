/* Add release date column to idols table */

BEGIN TRANSACTION;

ALTER TABLE idols ADD COLUMN release_date DATETIME DEFAULT NULL;

COMMIT;