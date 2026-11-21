import React from 'react';
import { View, Text } from 'react-native';
import TouchableOpacity from './PressableScale';

import { colors, radius, spacing, themedStyles } from '../constants/theme';
import { isSameDay, weekdayName } from '../utils/dates';
import IconLabel from './IconLabel';

export const formatVolume = (kg) =>
  `${Math.round(kg).toLocaleString('es-MX')} kg`;

// Tarjeta de un entrenamiento (Inicio y perfiles). Al tocarla se abre la ficha
// con el detalle, donde el dueño puede renombrarlo o cambiar su visibilidad.
// - showVisibility: muestra si es público o privado (solo en entrenamientos propios).
export default function WorkoutCard({
  workout,
  dateLabel,
  onPress,
  showVisibility = false,
}) {
  // Registro retroactivo: se entrenó un día y se registró otro.
  const loggedLater =
    workout.created_at &&
    !isSameDay(workout.workout_date, workout.created_at);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.8}
      accessibilityLabel={`Ver detalle de ${workout.title}`}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {workout.title}
        </Text>
        <Text style={styles.cardTime}>{dateLabel}</Text>
        {onPress ? <Text style={styles.chevron}>›</Text> : null}
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{workout.duration_minutes} min</Text>
          <Text style={styles.statLabel}>Duración</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {workout.summary?.total_sets ?? 0}
          </Text>
          <Text style={styles.statLabel}>Series</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {formatVolume(workout.summary?.volume_kg ?? 0)}
          </Text>
          <Text style={styles.statLabel}>Volumen</Text>
        </View>
      </View>

      {loggedLater ? (
        <IconLabel icon="time-outline" style={styles.metaRow}>
          Registrado el {weekdayName(workout.created_at)}
        </IconLabel>
      ) : null}

      {workout.summary?.cardio_minutes > 0 ? (
        <IconLabel icon="walk-outline" style={styles.metaRow}>
          Cardio: {workout.summary.cardio_minutes} min
          {workout.calories_burned > 0
            ? `  ·  ≈ ${workout.calories_burned} kcal`
            : ''}
        </IconLabel>
      ) : null}

      {workout.summary?.exercise_names?.length ? (
        <Text style={styles.exercises} numberOfLines={2}>
          {workout.summary.exercise_names.join(' · ')}
        </Text>
      ) : null}

      {showVisibility ? (
        <IconLabel
          icon={workout.is_public ? 'globe-outline' : 'lock-closed-outline'}
          style={styles.visibilityRow}
        >
          {workout.is_public ? 'Público' : 'Privado'}
        </IconLabel>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = themedStyles(() => ({
  card: {
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  cardTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginRight: spacing.sm,
  },

  cardTime: {
    color: colors.textMuted,
    fontSize: 11,
  },

  stats: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },

  stat: {
    flex: 1,
  },

  statValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  metaRow: {
    marginTop: spacing.sm,
  },

  exercises: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.md,
  },

  chevron: {
    color: colors.textMuted,
    fontSize: 20,
    marginLeft: spacing.sm,
  },

  visibilityRow: {
    marginTop: spacing.md,
  },
}));
