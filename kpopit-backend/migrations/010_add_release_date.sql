/* Add release date column to idols table */

BEGIN;

ALTER TABLE idols ADD COLUMN release_date DATE DEFAULT NULL;

COMMIT;