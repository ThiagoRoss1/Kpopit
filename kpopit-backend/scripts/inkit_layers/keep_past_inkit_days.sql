/* Dev databases only, once, after the switch from Blurry placeholders to real InkIt files: every idol
   picked on an InkIt day but missing from inkit_mode_data gets an inactive row (opaque paths, no
   files), so its past day keeps its answer and plays through the fallback layers. Inactive rows are
   never drawn again. Safe to re-run; a database without past InkIt picks is left unchanged. */

INSERT INTO inkit_mode_data (idol_id, image_path, pencil_path, pen_path, is_active)
SELECT picked.idol_id,
       '/images/inkit/' || replace(gen_random_uuid()::text, '-', '') || '.webp',
       '/images/inkit/pencil/' || replace(gen_random_uuid()::text, '-', '') || '.webp',
       '/images/inkit/pen/' || replace(gen_random_uuid()::text, '-', '') || '.webp',
       FALSE
FROM (
    SELECT DISTINCT dp.idol_id
    FROM daily_picks dp
    WHERE dp.gamemode_id = 4
      AND dp.idol_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM inkit_mode_data m WHERE m.idol_id = dp.idol_id)
) AS picked
ON CONFLICT (idol_id) DO NOTHING;
