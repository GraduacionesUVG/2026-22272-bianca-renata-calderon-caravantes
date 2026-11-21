// Fechas en la hora local del teléfono.

const DAY_MS = 24 * 60 * 60 * 1000;

export const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const isSameDay = (a, b) =>
  startOfDay(a).getTime() === startOfDay(b).getTime();

// "2026-10-05": el formato que espera el backend para workout_date.
export const toDateString = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// Días de calendario completos entre hoy y la fecha (negativo si ya pasó).
const daysFromToday = (value) =>
  Math.round((startOfDay(value) - startOfDay(new Date())) / DAY_MS);

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export const weekdayName = (value) =>
  new Date(value).toLocaleDateString('es-MX', { weekday: 'long' });

export const shortDayLabel = (value) =>
  capitalize(
    new Date(value)
      .toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })
      .replace('.', '')
  );

// Cuánto le queda a un reto, para organizarse. urgent: quedan 3 días o menos.
export const challengeTimeLabel = (challenge) => {
  if (challenge.status === 'upcoming') {
    const days = daysFromToday(challenge.start_date);

    return {
      label: days <= 1 ? 'Empieza mañana' : `Empieza en ${days} días`,
      urgent: false,
    };
  }

  if (challenge.status === 'completed') {
    return {
      label: `Terminó el ${new Date(challenge.end_date).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
      })}`,
      urgent: false,
    };
  }

  const days = daysFromToday(challenge.end_date);

  if (days <= 0) return { label: 'Termina hoy', urgent: true };
  if (days === 1) return { label: 'Termina mañana', urgent: true };

  return { label: `Termina en ${days} días`, urgent: days <= 3 };
};
