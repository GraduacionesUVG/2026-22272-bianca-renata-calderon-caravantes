CREATE TABLE IF NOT EXISTS follows (
    follower_id UUID NOT NULL,
    followed_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT follows_pkey
        PRIMARY KEY (follower_id, followed_id),

    CONSTRAINT follows_follower_fk
        FOREIGN KEY (follower_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT follows_followed_fk
        FOREIGN KEY (followed_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT follows_no_self_follow
        CHECK (follower_id <> followed_id)
);

-- La PK (follower_id, followed_id) ya indexa las búsquedas por follower_id;
-- solo falta el índice para listar seguidores de un usuario.
CREATE INDEX IF NOT EXISTS idx_follows_followed
    ON follows(followed_id);
