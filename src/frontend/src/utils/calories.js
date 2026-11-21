// Calorías ≈ MET × peso (kg) × horas. Es la misma fórmula que usa el backend,
// que es quien guarda el valor; aquí solo se muestra la estimación.
export const estimateCalories = (met, weightKg, minutes) =>
  met && weightKg && minutes > 0
    ? Math.round((met * weightKg * minutes) / 60)
    : null;

// Igual que StrengthMET en el backend: fuerza con varios ejercicios de 8-15
// reps, descansos incluidos (Compendium of Physical Activities, 02054).
export const STRENGTH_MET = 3.5;

// La fuerza ocupa la duración total menos los minutos de cardio.
export const estimateStrengthCalories = (weightKg, totalMinutes, cardioMinutes) =>
  estimateCalories(STRENGTH_MET, weightKg, Math.max(totalMinutes - cardioMinutes, 0));
