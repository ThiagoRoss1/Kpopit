/* InkIt, the 4th daily mode: its gamemode row and one photo per idol. The photo path is opaque
   (never the idol's name), since it is sent to the browser before the answer is found. Seeded
   from the Blurry photos; the objects are copied to these paths in the image bucket. */

BEGIN;

INSERT INTO gamemodes (id, name, description, is_active)
VALUES (4, 'inkit', 'InkIt mode: draw on a blank sheet to reveal the idol photo and guess who it is.', FALSE)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('gamemodes', 'id'), (SELECT MAX(id) FROM gamemodes));

CREATE TABLE IF NOT EXISTS inkit_mode_data (
    idol_id INTEGER PRIMARY KEY,
    image_path TEXT NOT NULL,
    image_version TEXT NOT NULL DEFAULT '1',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_inkit_mode_data_idol_id FOREIGN KEY (idol_id) REFERENCES idols(id) ON DELETE CASCADE,
    CONSTRAINT uq_inkit_mode_data_image_path UNIQUE (image_path)
);

INSERT INTO inkit_mode_data (idol_id, image_path, is_active)
SELECT b.idol_id, '/images/inkit/' || replace(gen_random_uuid()::text, '-', '') || '.webp', COALESCE(b.is_active, TRUE)
FROM blurry_mode_data b
ON CONFLICT (idol_id) DO NOTHING;

COMMIT;
