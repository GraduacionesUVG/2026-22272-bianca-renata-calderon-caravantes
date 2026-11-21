-- Hip Thrust (empuje de cadera) en el catálogo. Sin imagen: la ficha muestra
-- la animación de la app (frontend/src/components/exerciseFigures.js), que se
-- asocia por el nombre exacto "Hip Thrust".
-- Idempotente: se puede volver a ejecutar sin duplicar nada.

INSERT INTO exercises (name, muscle_group, equipment, difficulty, description)
SELECT v.name, v.muscle_group, v.equipment, v.difficulty, v.description
FROM (
    VALUES
        ('Hip Thrust', 'legs', 'Barbell', 'intermediate',
         'Con la parte alta de la espalda apoyada en un banco y la barra sobre la cadera, empuja con los glúteos hasta alinear torso y muslos, y baja controlado.')
) AS v(name, muscle_group, equipment, difficulty, description)
WHERE NOT EXISTS (
    SELECT 1
    FROM exercises e
    WHERE e.created_by IS NULL
      AND lower(e.name) = lower(v.name)
);
