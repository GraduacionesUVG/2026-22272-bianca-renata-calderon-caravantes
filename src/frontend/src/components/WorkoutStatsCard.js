import React from 'react';
import { View, Text } from 'react-native';

import { colors, radius, spacing, themedStyles } from '../constants/theme';
import { formatVolume } from './WorkoutCard';

const MUSCLE_LABELS = {
  chest: 'Pecho',
  back: 'Espalda',
  legs: 'Piernas',
  shoulders: 'Hombros',
  arms: 'Brazos',
  core: 'Core',
  full_body: 'Cuerpo completo',
};

export const formatNumber = (value) => Math.round(value).toLocaleString('es-MX');

export const formatHours = (minutes) =>
  minutes >= 60
    ? `${Math.floor(minutes / 60)} h ${minutes % 60} min`
    : `${minutes} min`;

const formatKg = (kg) =>
  `${Number.isInteger(kg) ? kg : kg.toFixed(1)} kg`;

function Tile({ value, label }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

// Estadísticas de todos los entrenamientos (GET /users/stats).
export default function WorkoutStatsCard({ stats, hasWeight }) {
  if (!stats) {
    return null;
  }

  if (stats.total_workouts === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Estadísticas</Text>
        <Text style={styles.empty}>
          Registra tu primer entrenamiento para ver tus estadísticas.
        </Text>
      </View>
    );
  }

  const maxGroupSets = Math.max(1, ...stats.muscle_groups.map((group) => group.sets));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Estadísticas</Text>

      <Text style={styles.sectionLabel}>Este mes</Text>
      <View style={styles.tiles}>
        <Tile value={stats.month_workouts} label="Entrenos" />
        <Tile value={formatHours(stats.month_minutes)} label="Tiempo" />
        <Tile value={formatNumber(stats.month_calories)} label="kcal" />
      </View>

      <Text style={styles.sectionLabel}>Total</Text>
      <View style={styles.tiles}>
        <Tile value={stats.total_workouts} label="Entrenos" />
        <Tile value={formatHours(stats.total_minutes)} label="Tiempo" />
        <Tile value={formatNumber(stats.total_sets)} label="Series" />
      </View>
      <View style={styles.tiles}>
        <Tile value={formatVolume(stats.volume_kg)} label="Volumen" />
        <Tile value={formatHours(stats.cardio_minutes)} label="Cardio" />
        <Tile value={formatNumber(stats.total_calories)} label="kcal totales" />
      </View>

      {stats.total_calories > 0 ? (
        <Text style={styles.note}>
          Fuerza ≈ {formatNumber(stats.strength_calories)} kcal · Cardio ≈{' '}
          {formatNumber(stats.cardio_calories)} kcal (estimación)
        </Text>
      ) : !hasWeight ? (
        <Text style={styles.note}>
          Agrega tu peso en tu perfil para estimar las calorías de tus próximos
          entrenamientos.
        </Text>
      ) : null}

      {stats.favorite_exercise ? (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Favorito</Text>
          <Text style={styles.rowValue} numberOfLines={1}>
            {stats.favorite_exercise}{' '}
            <Text style={styles.rowMuted}>
              ({stats.favorite_exercise_count}{' '}
              {stats.favorite_exercise_count === 1 ? 'vez' : 'veces'})
            </Text>
          </Text>
        </View>
      ) : null}

      {stats.personal_records.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>Récords personales</Text>
          {stats.personal_records.map((record) => (
            <View key={record.exercise_name} style={styles.row}>
              <Text style={styles.rowLabel} numberOfLines={1}>
                {record.exercise_name}
              </Text>
              <Text style={styles.rowValue}>
                {formatKg(record.weight_kg)}{' '}
                <Text style={styles.rowMuted}>× {record.reps}</Text>
              </Text>
            </View>
          ))}
        </>
      ) : null}

      {stats.muscle_groups.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>Series por grupo muscular</Text>
          {stats.muscle_groups.map((group) => (
            <View key={group.muscle_group} style={styles.barRow}>
              <Text style={styles.barLabel}>
                {MUSCLE_LABELS[group.muscle_group] ?? group.muscle_group}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(group.sets / maxGroupSets) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.barValue}>{group.sets}</Text>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },

  empty: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.sm,
  },

  sectionLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  tile: {
    flex: 1,
    backgroundColor: colors.card2,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },

  tileValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  tileLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  note: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.xs,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },

  rowLabel: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },

  rowValue: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },

  rowMuted: {
    color: colors.textMuted,
    fontWeight: '400',
  },

  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 6,
  },

  barLabel: {
    width: 96,
    color: colors.text,
    fontSize: 11,
  },

  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.card2,
    overflow: 'hidden',
  },

  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.accent,
  },

  barValue: {
    width: 32,
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
}));
