/* Fix idol_career table - recreate with proper FOREIGN KEY constraints */

BEGIN;

CREATE TABLE idol_career_new (
    idol_id INTEGER,
    group_id INTEGER,
    is_active BOOLEAN NOT NULL,
    start_year INTEGER,
    end_year INTEGER,

    /* --- Primary Key --- */
    PRIMARY KEY(idol_id, group_id),

    /* --- Foreign Keys --- */
    CONSTRAINT fk_idol_career_idol_id FOREIGN KEY(idol_id) REFERENCES idols(id),
    CONSTRAINT fk_idol_career_group_id FOREIGN KEY(group_id) REFERENCES groups(id)
);

INSERT INTO idol_career_new SELECT * FROM idol_career;

DROP TABLE IF EXISTS idol_career CASCADE;

ALTER TABLE idol_career_new RENAME TO idol_career;

COMMIT;