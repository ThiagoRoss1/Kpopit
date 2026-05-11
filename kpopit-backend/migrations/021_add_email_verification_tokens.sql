BEGIN;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    token_type VARCHAR(20) NOT NULL, -- 'verification' or 'password_reset'
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evt_token_hash ON email_verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_evt_user_id ON email_verification_tokens(user_id);

COMMIT;