-- Notificaciones dentro de la app: likes y comentarios en tus publicaciones y
-- nuevos seguidores. La tabla notifications ya existía sin uso (solo título y
-- mensaje); le añadimos el tipo, quién hizo la acción y sobre qué publicación,
-- para que la app pueda enlazarla y evitar duplicados. El texto lo arma la app.
--
-- Las columnas nuevas son NOT NULL sin valor por defecto: si la tabla tuviera
-- filas, la migración fallaría en vez de inventar datos.

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL,
    ADD COLUMN IF NOT EXISTS actor_id UUID NOT NULL,
    ADD COLUMN IF NOT EXISTS post_id UUID,
    ADD COLUMN IF NOT EXISTS comment_id UUID;

-- Título y mensaje quedan para posibles avisos generales del sistema.
ALTER TABLE notifications ALTER COLUMN title DROP NOT NULL;
ALTER TABLE notifications ALTER COLUMN message DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_notification_type') THEN
        ALTER TABLE notifications
            ADD CONSTRAINT chk_notification_type
                CHECK (type IN ('like', 'comment', 'follow')),
            -- Si se borra quien actuó, la publicación o el comentario, la
            -- notificación deja de tener sentido y se borra con ellos.
            ADD CONSTRAINT fk_notification_actor
                FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
            ADD CONSTRAINT fk_notification_post
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
            ADD CONSTRAINT fk_notification_comment
                FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
            ADD CONSTRAINT chk_notification_target CHECK (
                (type = 'follow' AND post_id IS NULL)
                OR (type = 'like' AND post_id IS NOT NULL)
                OR (type = 'comment' AND post_id IS NOT NULL AND comment_id IS NOT NULL)
            );
    END IF;
END
$$;

-- Como máximo una notificación por like o seguimiento, aunque se toque el
-- botón varias veces. Al quitar el like o dejar de seguir, la app la borra.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_like
    ON notifications(actor_id, post_id)
    WHERE type = 'like';

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_follow
    ON notifications(actor_id, user_id)
    WHERE type = 'follow';

-- Listado del usuario y contador de no leídas.
DROP INDEX IF EXISTS idx_notifications_user;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON notifications(user_id)
    WHERE NOT is_read;
