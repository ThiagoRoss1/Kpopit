BEGIN;

ALTER TABLE blurry_mode_data DROP CONSTRAINT blurry_mode_data_pkey;
ALTER TABLE blurry_mode_data DROP COLUMN id;
ALTER TABLE blurry_mode_data ADD PRIMARY KEY (idol_id);

ALTER TABLE blurry_mode_data DROP CONSTRAINT IF EXISTS blurry_mode_data_idol_id_key;
DROP INDEX IF EXISTS idx_blurry_mode_data_idol_id;

COMMIT;