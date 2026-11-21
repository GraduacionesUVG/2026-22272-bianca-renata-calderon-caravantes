-- Ejercicios propios, nuevos ejercicios del catálogo y calorías de fuerza.
-- Idempotente: se puede volver a ejecutar sin duplicar nada. Va en una
-- transacción: si algo falla, no queda aplicada a medias.

BEGIN;

-- 1. Ejercicios propios: created_by NULL = catálogo; si no, solo lo ve
--    quien lo creó.
ALTER TABLE exercises
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE CASCADE;

-- El nombre deja de ser único en toda la tabla: dos personas pueden crear
-- "Hip Thrust". Sigue siendo único (sin distinguir mayúsculas) dentro del
-- catálogo y dentro de los ejercicios de cada persona.
-- Ojo: las migraciones anteriores usan ON CONFLICT (name) y ya no se pueden
-- volver a ejecutar tal cual.
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_catalog_name
    ON exercises (lower(name))
    WHERE created_by IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_custom_name
    ON exercises (created_by, lower(name))
    WHERE created_by IS NOT NULL;

-- 2. Ejercicios que la gente buscaba y no encontraba. Sin imagen: la ficha
--    muestra solo la descripción.
INSERT INTO exercises (name, muscle_group, equipment, difficulty, description)
SELECT v.name, v.muscle_group, v.equipment, v.difficulty, v.description
FROM (
    VALUES
        ('Lunges', 'legs', NULL, 'beginner',
         'Zancada en el sitio: da un paso al frente, baja hasta que ambas rodillas formen 90° y regresa.'),
        ('Split Lunge', 'legs', NULL, 'beginner',
         'Zancada estática: con un pie adelante y otro atrás, sube y baja sin mover los pies.'),
        ('Wall Sit', 'legs', NULL, 'beginner',
         'Sentadilla isométrica con la espalda apoyada en la pared y las rodillas a 90°. Usa el cronómetro y anota en Reps los segundos que aguantaste.'),
        ('Step Up', 'legs', 'Box', 'beginner',
         'Sube a un banco o cajón con una pierna, extiende la cadera y baja controlado.')
) AS v(name, muscle_group, equipment, difficulty, description)
WHERE NOT EXISTS (
    SELECT 1
    FROM exercises e
    WHERE e.created_by IS NULL
      AND lower(e.name) = lower(v.name)
);

-- 3. Calorías de fuerza. calories_burned pasa a ser el total (cardio +
--    fuerza); strength_calories guarda la parte de fuerza para el desglose.
--    Solo se ejecuta la primera vez (cuando aún no existe la columna): si se
--    repitiera, sumaría la fuerza otra vez a entrenamientos ya calculados.
--
--    Entrenamientos ya registrados: fuerza = MET 3.5 × peso × (duración total
--    − minutos de cardio, nunca negativo). 3.5 es el MET del Compendium
--    (Ainsworth et al., 2011) para "resistance training, multiple exercises,
--    8-15 reps" (código 02054); incluye los descansos entre series. Debe
--    coincidir con StrengthMET en Go. Sesiones solo de cardio o de usuarios
--    sin peso quedan con 0.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'workouts'
          AND column_name = 'strength_calories'
    ) THEN
        RETURN;
    END IF;

    ALTER TABLE workouts
        ADD COLUMN strength_calories INTEGER NOT NULL DEFAULT 0;

    UPDATE workouts w
    SET strength_calories = s.kcal,
        calories_burned = w.calories_burned + s.kcal
    FROM (
        SELECT
            wk.id,
            ROUND(
                3.5 * u.weight_kg * GREATEST(
                    wk.duration_minutes * 60
                        - COALESCE(SUM(we.duration_seconds) FILTER (WHERE e.muscle_group = 'cardio'), 0),
                    0
                ) / 3600.0
            )::int AS kcal
        FROM workouts wk
        JOIN users u ON u.id = wk.user_id
        JOIN workout_exercises we ON we.workout_id = wk.id
        JOIN exercises e ON e.id = we.exercise_id
        WHERE u.weight_kg IS NOT NULL
        GROUP BY wk.id, u.weight_kg
        HAVING BOOL_OR(e.muscle_group <> 'cardio')
    ) s
    WHERE w.id = s.id;

    ALTER TABLE workouts
        ADD CONSTRAINT chk_workouts_strength_calories
        CHECK (strength_calories >= 0 AND strength_calories <= calories_burned);
END
$$;

COMMIT;
