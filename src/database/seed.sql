-- =========================================
-- Gymify Seed Data
-- Initial exercise catalog
-- =========================================

INSERT INTO exercises (
    name,
    description,
    muscle_group,
    equipment,
    difficulty
)
VALUES
(
    'Bench Press',
    'Press de banca para trabajar principalmente pecho.',
    'chest',
    'Barbell',
    'intermediate'
),
(
    'Push Up',
    'Ejercicio de peso corporal enfocado en pecho y tríceps.',
    'chest',
    NULL,
    'beginner'
),
(
    'Lat Pulldown',
    'Jalón en polea para trabajar espalda.',
    'back',
    'Cable Machine',
    'beginner'
),
(
    'Barbell Row',
    'Remo con barra enfocado en espalda.',
    'back',
    'Barbell',
    'intermediate'
),
(
    'Squat',
    'Sentadilla para trabajar principalmente piernas.',
    'legs',
    'Barbell',
    'intermediate'
),
(
    'Leg Press',
    'Prensa de piernas en máquina.',
    'legs',
    'Leg Press Machine',
    'beginner'
),
(
    'Romanian Deadlift',
    'Ejercicio enfocado en femorales y cadena posterior.',
    'legs',
    'Barbell',
    'intermediate'
),
(
    'Shoulder Press',
    'Press vertical para trabajar hombros.',
    'shoulders',
    'Dumbbells',
    'beginner'
),
(
    'Lateral Raise',
    'Elevaciones laterales para hombros.',
    'shoulders',
    'Dumbbells',
    'beginner'
),
(
    'Bicep Curl',
    'Curl para trabajar bíceps.',
    'arms',
    'Dumbbells',
    'beginner'
),
(
    'Tricep Pushdown',
    'Extensión de tríceps utilizando polea.',
    'arms',
    'Cable Machine',
    'beginner'
),
(
    'Plank',
    'Ejercicio isométrico para fortalecer el core.',
    'core',
    NULL,
    'beginner'
)
ON CONFLICT (name) DO NOTHING;
