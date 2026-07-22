BEGIN;

CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    album_label TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collection_group_eligibility (
    collection_id INTEGER NOT NULL REFERENCES collections(id),
    group_id INTEGER NOT NULL REFERENCES groups(id),
    is_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    has_bonus_cover BOOLEAN NOT NULL DEFAULT TRUE,

    PRIMARY KEY (collection_id, group_id)
);

CREATE TABLE IF NOT EXISTS cards (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER NOT NULL REFERENCES collections(id),
    idol_id INTEGER REFERENCES idols(id),
    group_id INTEGER REFERENCES groups(id),
    card_type TEXT NOT NULL DEFAULT 'idol',
    image_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_cards_card_type CHECK (card_type IN ('idol', 'group_photo', 'special')),
    CONSTRAINT chk_cards_identity CHECK (
        (card_type = 'idol' AND idol_id IS NOT NULL AND group_id IS NULL) OR
        (card_type = 'group_photo' AND idol_id IS NULL AND group_id IS NOT NULL) OR
        (card_type = 'special' AND idol_id IS NULL AND group_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_member_card
    ON cards (collection_id, idol_id)
    WHERE card_type = 'idol';

CREATE UNIQUE INDEX IF NOT EXISTS uq_group_card
    ON cards (collection_id, group_id)
    WHERE card_type = 'group_photo';

CREATE UNIQUE INDEX IF NOT EXISTS uq_special_card
    ON cards (collection_id, group_id)
    WHERE card_type = 'special';

CREATE TABLE IF NOT EXISTS user_cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    card_id INTEGER NOT NULL REFERENCES cards(id),
    level INTEGER NOT NULL DEFAULT 1,
    times_won INTEGER NOT NULL DEFAULT 1,
    first_won_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_user_card UNIQUE (user_id, card_id),
    CONSTRAINT chk_user_cards_level CHECK (level BETWEEN 1 AND 3)
);

CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON user_cards (user_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_card_id ON user_cards (card_id);

COMMIT;