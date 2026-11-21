// Nombre por defecto al estilo Strava: tipo de actividad + momento del día,
// p. ej. "Entrenamiento de pesas por la tarde" o "Carrera por la mañana".
// La fecha no va en el nombre: la tarjeta ya la muestra.

// Nombres de los ejercicios de cardio del catálogo → actividad en español.
const CARDIO_ACTIVITIES = {
  Running: 'Carrera',
  Cycling: 'Bici',
  'Stair Climbing': 'Escaleras',
};

export const timeOfDay = (date = new Date()) => {
  const hour = date.getHours();

  if (hour < 5) return 'de madrugada';
  if (hour < 12) return 'por la mañana';
  if (hour < 19) return 'por la tarde';

  return 'por la noche';
};

const activityName = (selected) => {
  const cardio = selected.filter((item) => item.muscle_group === 'cardio');
  const hasStrength = cardio.length < selected.length;

  if (cardio.length === 0) return 'Entrenamiento de pesas';
  if (hasStrength) return 'Pesas y cardio';

  const activities = [
    ...new Set(cardio.map((item) => CARDIO_ACTIVITIES[item.name] ?? 'Cardio')),
  ];

  return activities.length === 1 ? activities[0] : 'Cardio';
};

export const defaultWorkoutTitle = (selected, date = new Date()) =>
  selected.length === 0 ? '' : `${activityName(selected)} ${timeOfDay(date)}`;
