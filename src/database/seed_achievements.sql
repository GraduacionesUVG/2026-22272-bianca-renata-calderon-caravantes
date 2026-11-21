-- =========================================
-- Gymify Achievements Seed Data
-- =========================================

INSERT INTO achievements (
    title,
    description,
    xp_reward,
    icon
)
VALUES
    (
        'Primer entrenamiento',
        'Completa tu primer entrenamiento.',
        50,
        'trophy'
    ),
    (
        'En marcha',
        'Completa 5 entrenamientos.',
        100,
        'dumbbell'
    ),
    (
        'Constancia',
        'Alcanza una racha de 3 días.',
        100,
        'flame'
    ),
    (
        'Imparable',
        'Alcanza una racha de 7 días.',
        200,
        'fire'
    ),
    (
        '500 Club',
        'Acumula 500 XP.',
        150,
        'star'
    ),
    (
        'Nivel 2',
        'Alcanza el nivel 2.',
        100,
        'level-up'
    )
ON CONFLICT (title) DO NOTHING;
