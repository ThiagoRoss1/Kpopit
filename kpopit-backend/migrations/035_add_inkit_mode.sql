/* InkIt, the 4th daily mode: its gamemode row and the table of its files (photo, pencil, pen) per
   idol. Every path is opaque, since it reaches the browser before the answer is found. Rows come
   only from seed_db.py; the migration creates none. */

BEGIN;

INSERT INTO gamemodes (id, name, description, is_active)
VALUES (4, 'inkit', 'InkIt mode: draw on a blank sheet to reveal the idol photo and guess who it is.', FALSE)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('gamemodes', 'id'), (SELECT MAX(id) FROM gamemodes));

CREATE TABLE IF NOT EXISTS inkit_mode_data (
    idol_id INTEGER PRIMARY KEY,
    image_path TEXT NOT NULL,
    image_file TEXT NULL UNIQUE,
    pencil_path TEXT NULL UNIQUE,
    pen_path TEXT NULL UNIQUE,
    image_version TEXT NOT NULL DEFAULT '1',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_inkit_mode_data_idol_id FOREIGN KEY (idol_id) REFERENCES idols(id) ON DELETE CASCADE,
    CONSTRAINT uq_inkit_mode_data_image_path UNIQUE (image_path)
);

COMMIT;
