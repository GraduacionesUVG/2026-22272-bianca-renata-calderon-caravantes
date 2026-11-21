-- Entrenamientos públicos o privados (como en Strava). Los públicos se ven en
-- el perfil del usuario; los privados solo los ve su dueño.
--
-- Los entrenamientos ya registrados quedan privados: nadie aceptó publicarlos.
-- La app propone "Público" al registrar uno nuevo, y se puede cambiar después.

ALTER TABLE workouts
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

-- Para listar los entrenamientos públicos de un perfil, del más reciente.
CREATE INDEX IF NOT EXISTS idx_workouts_public_by_user
    ON workouts(user_id, workout_date DESC)
    WHERE is_public;
