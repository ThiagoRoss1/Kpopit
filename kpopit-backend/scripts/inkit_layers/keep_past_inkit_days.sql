/* Dev databases only, once, after the switch from Blurry placeholders to real InkIt files: every
   InkIt day whose answer isn't in the mode (no active InkIt row) gets an idol that is, preferring
   ones never picked; games played on those days are cleared (they were against the old answer), and
   inactive leftover rows are removed. Run the whole file as one script. Safe to re-run. */

BEGIN;

CREATE TEMP TABLE off_mode_days ON COMMIT DROP AS
SELECT dp.pick_date, row_number() OVER (ORDER BY dp.pick_date) AS n
FROM daily_picks dp
WHERE dp.gamemode_id = 4
  AND NOT EXISTS (SELECT 1 FROM inkit_mode_data m WHERE m.idol_id = dp.idol_id AND m.is_active);

-- The same idols the daily draw picks from, never-picked ones first.
CREATE TEMP TABLE mode_idols ON COMMIT DROP AS
SELECT m.idol_id,
       row_number() OVER (
           ORDER BY EXISTS (SELECT 1 FROM daily_picks p WHERE p.gamemode_id = 4 AND p.idol_id = m.idol_id), random()
       ) AS n
FROM inkit_mode_data m
JOIN idols i ON i.id = m.idol_id AND i.is_published
WHERE m.is_active;

CREATE TEMP TABLE remap ON COMMIT DROP AS
SELECT d.pick_date, i.idol_id AS new_idol_id
FROM off_mode_days d
JOIN mode_idols i ON i.n = (d.n - 1) % (SELECT COUNT(*) FROM mode_idols) + 1;

DELETE FROM daily_user_history h USING remap r WHERE h.gamemode_id = 4 AND h.date = r.pick_date;
DELETE FROM inkit_drafts d USING remap r WHERE d.game_date = r.pick_date;

UPDATE daily_picks dp SET idol_id = r.new_idol_id
FROM remap r WHERE dp.gamemode_id = 4 AND dp.pick_date = r.pick_date;

UPDATE yesterday_picks y SET past_idol_id = r.new_idol_id
FROM remap r WHERE y.gamemode_id = 4 AND y.yesterdays_pick_date = r.pick_date;

DELETE FROM inkit_mode_data m
WHERE NOT m.is_active
  AND NOT EXISTS (SELECT 1 FROM daily_picks dp WHERE dp.gamemode_id = 4 AND dp.idol_id = m.idol_id);

SELECT pick_date, new_idol_id FROM remap ORDER BY pick_date;

COMMIT;
