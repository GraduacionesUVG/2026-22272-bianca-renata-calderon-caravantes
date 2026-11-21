-- Password recovery codes for Gymify

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    -- HMAC-SHA256 del código de 6 dígitos; el código nunca se guarda en claro.
    code_hash TEXT NOT NULL,

    -- Intentos fallidos; al llegar al máximo el código queda invalidado.
    attempts INTEGER NOT NULL DEFAULT 0,

    expires_at TIMESTAMP NOT NULL,

    used_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
    ON password_reset_tokens(user_id);

-- Garantiza como máximo un código activo (sin usar) por usuario.
CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_one_active
    ON password_reset_tokens(user_id)
    WHERE used_at IS NULL;
