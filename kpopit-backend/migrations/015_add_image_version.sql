/* Add image version columns to idols and blurry_mode_data */

PRAGMA foreign_keys=OFF;

BEGIN TRANSACTION;

ALTER TABLE idols ADD COLUMN image_version TEXT DEFAULT '1';
ALTER TABLE blurry_mode_data ADD COLUMN blur_image_version TEXT DEFAULT '1';

COMMIT;

PRAGMA foreign_keys=ON;