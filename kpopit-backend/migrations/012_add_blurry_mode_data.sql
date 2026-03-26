/* Add blurry mode specific data table */

BEGIN;

/* Create blurry_mode_data table */
CREATE TABLE IF NOT EXISTS blurry_mode_data (
    id SERIAL PRIMARY KEY NOT NULL,
    idol_id INTEGER UNIQUE NOT NULL,
    blur_image_path TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),
    updated_at TEXT NOT NULL DEFAULT to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'),

    /* Foreign Key */
    CONSTRAINT fk_blurry_mode_data_idol_id FOREIGN KEY (idol_id) REFERENCES idols(id) ON DELETE CASCADE
);

/* Create unique constraint - one blurry config per idol */
CREATE UNIQUE INDEX IF NOT EXISTS idx_blurry_mode_data_idol_id
ON blurry_mode_data(idol_id);

COMMIT;