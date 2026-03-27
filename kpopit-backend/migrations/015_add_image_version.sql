/* Add image version columns to idols and blurry_mode_data */

BEGIN;

ALTER TABLE idols ADD COLUMN IF NOT EXISTS image_version TEXT DEFAULT '1';
ALTER TABLE blurry_mode_data ADD COLUMN IF NOT EXISTS blur_image_version TEXT DEFAULT '1';

COMMIT;