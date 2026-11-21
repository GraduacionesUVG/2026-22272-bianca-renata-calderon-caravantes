-- Racha semanal: el usuario elige cuántos días por semana quiere entrenar
-- (1 a 7) y la racha cuenta semanas consecutivas (lunes a domingo) en las
-- que cumplió esa meta.

-- NULL significa que el usuario todavía no eligió su meta; la app se la
-- pide al iniciar sesión.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS weekly_goal SMALLINT
        CONSTRAINT chk_users_weekly_goal
        CHECK (weekly_goal BETWEEN 1 AND 7);

-- Historial de metas por semana. La meta de una semana es la última fila
-- con week_start <= esa semana, así que cambiar la meta no altera las
-- semanas anteriores.
CREATE TABLE IF NOT EXISTS weekly_goal_history (
    user_id UUID NOT NULL,
    week_start DATE NOT NULL,
    goal SMALLINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT weekly_goal_history_pkey
        PRIMARY KEY (user_id, week_start),

    CONSTRAINT weekly_goal_history_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_weekly_goal_history_goal
        CHECK (goal BETWEEN 1 AND 7),

    -- date_trunc('week', ...) en PostgreSQL siempre devuelve un lunes.
    CONSTRAINT chk_weekly_goal_history_monday
        CHECK (EXTRACT(ISODOW FROM week_start) = 1)
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_date
    ON workouts(user_id, workout_date);

-- La racha anterior contaba días; ahora cuenta semanas. Se recalcula sola
-- en cuanto cada usuario elige su meta.
UPDATE users SET streak = 0;

UPDATE achievements
SET description = 'Alcanza una racha de 3 semanas.'
WHERE title = 'Constancia';

UPDATE achievements
SET description = 'Alcanza una racha de 7 semanas.'
WHERE title = 'Imparable';
