-- Índice para paginar el feed por cursor: ORDER BY created_at DESC, id DESC
-- con la condición (created_at, id) < (cursor). Idempotente.
CREATE INDEX IF NOT EXISTS idx_posts_created_at_id
	ON posts (created_at DESC, id DESC);
