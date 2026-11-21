-- Peso corporal (para estimar calorías del cardio), preferencia de
-- celebraciones (confeti) y valor MET de los ejercicios de cardio.

-- Opcional: sin peso no se estiman calorías.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS celebrations_enabled BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_weight') THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_weight CHECK (weight_kg BETWEEN 25 AND 300);
    END IF;
END
$$;

-- MET: gasto energético de la actividad respecto al reposo.
-- Calorías ≈ MET × peso (kg) × horas. Valores del Compendium of Physical
-- Activities (Ainsworth et al., 2011) para un ritmo moderado.
ALTER TABLE exercises
    ADD COLUMN IF NOT EXISTS met NUMERIC(4,1);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_exercises_met') THEN
        ALTER TABLE exercises
            ADD CONSTRAINT chk_exercises_met CHECK (met > 0);
    END IF;
END
$$;

UPDATE exercises SET met = 8.3 WHERE name = 'Running';        -- correr ~8 km/h
UPDATE exercises SET met = 7.0 WHERE name = 'Cycling';        -- bicicleta, esfuerzo moderado
UPDATE exercises SET met = 8.0 WHERE name = 'Stair Climbing'; -- subir escaleras
