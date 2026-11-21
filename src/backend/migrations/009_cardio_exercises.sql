-- Ejercicios de cardio. Se registran por minutos: la app guarda la duración
-- en workout_exercises.duration_seconds (con 1 serie × 1 repetición para
-- cumplir las restricciones de la tabla).
--
-- Stair Climbing no tiene imagen: la única opción en wger está generada por IA.
-- Idempotente: si el ejercicio ya existe (mismo nombre), no se toca.

INSERT INTO exercises (
    name, muscle_group, equipment, difficulty, description,
    image_url, image_author, image_license, image_license_url, image_source_url
)
VALUES
    ('Running', 'cardio', NULL, 'beginner',
     'Correr al aire libre o en caminadora a un ritmo que puedas mantener.',
     'https://wger.de/media/exercise-images/1615/7792295c-83b6-4ea8-9353-ce02f0ad2559.jpg.400x400_q85.jpg',
     'wger.de', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
     'https://wger.de/en/exercise/1615/view/'),
    ('Stair Climbing', 'cardio', NULL, 'beginner',
     'Subir gradas o escaleras de forma continua; también vale la máquina escaladora.',
     NULL, NULL, NULL, NULL, NULL),
    ('Cycling', 'cardio', NULL, 'beginner',
     'Bicicleta al aire libre o estática a ritmo constante.',
     'https://wger.de/media/exercise-images/1618/c18baedc-ff98-4fb2-b4f5-38a05c12f637.png.400x400_q85.png',
     'wger.de', 'CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/',
     'https://wger.de/en/exercise/1618/view/')
ON CONFLICT (name) DO NOTHING;
