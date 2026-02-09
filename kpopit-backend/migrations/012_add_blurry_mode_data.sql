/* Add blurry mode specific data table */

BEGIN TRANSACTION;

PRAGMA foreign_keys=OFF;

/* Create blurry_mode_data table */
CREATE TABLE IF NOT EXISTS blurry_mode_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idol_id INTEGER UNIQUE NOT NULL,
    blur_image_path TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),

    /* Foreign Key */
    FOREIGN KEY (idol_id) REFERENCES idols(id) ON DELETE CASCADE
);

/* Create unique constraint - one blurry config per idol */
CREATE UNIQUE INDEX IF NOT EXISTS idx_blurry_mode_data_idol_id
ON blurry_mode_data(idol_id);

PRAGMA foreign_keys=ON;

COMMIT;