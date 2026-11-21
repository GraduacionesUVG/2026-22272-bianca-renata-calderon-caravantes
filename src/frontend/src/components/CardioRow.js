import React from 'react';
import { View, Text, TextInput } from 'react-native';
import TouchableOpacity from './PressableScale';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radius, spacing, themedStyles } from '../constants/theme';
import { estimateCalories } from '../utils/calories';
import { formatElapsed, useStopwatch } from '../utils/stopwatch';

// Fila de un ejercicio de cardio: cronómetro, minutos y calorías estimadas.
export default function CardioRow({
  exercise,
  met,
  weightKg,
  onChangeMinutes,
  onRemove,
  onPreview,
}) {
  // Los minutos se van llenando solos mientras corre el cronómetro.
  const {
    elapsedMs,
    running,
    toggle: toggleStopwatch,
    reset: resetStopwatch,
  } = useStopwatch((elapsed) =>
    onChangeMinutes(String(Math.max(1, Math.round(elapsed / 60000))))
  );

  const minutes = Number(exercise.minutes) || 0;
  const calories = estimateCalories(met, weightKg, minutes);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.nameButton} onPress={onPreview}>
          <Text style={styles.name} numberOfLines={1}>
            <Ionicons name="walk-outline" size={14} />{' '}
            {exercise.name}{' '}
            <Ionicons
              name="information-circle-outline"
              size={13}
              color={colors.textMuted}
            />
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onRemove}
          accessibilityLabel={`Quitar ${exercise.name}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.stopwatchRow}>
        <Text
          style={[styles.elapsed, running && styles.elapsedRunning]}
          accessibilityLabel={`Cronómetro ${formatElapsed(elapsedMs)}`}
        >
          {formatElapsed(elapsedMs)}
        </Text>

        <TouchableOpacity
          style={[styles.playButton, running && styles.pauseButton]}
          onPress={toggleStopwatch}
        >
          <Text style={[styles.playText, running && styles.pauseText]}>
            <Ionicons name={running ? 'pause' : 'play'} size={12} />{' '}
            {running ? 'Pausar' : elapsedMs > 0 ? 'Seguir' : 'Iniciar'}
          </Text>
        </TouchableOpacity>

        {elapsedMs > 0 && !running ? (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetStopwatch}
            accessibilityLabel="Reiniciar cronómetro"
          >
            <Ionicons name="refresh" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.minutesBox}>
          <TextInput
            style={styles.minutesInput}
            value={exercise.minutes}
            onChangeText={onChangeMinutes}
            keyboardType="numeric"
            editable={!running}
            accessibilityLabel={`Minutos de ${exercise.name}`}
          />
          <Text style={styles.unit}>min</Text>
        </View>

        <Text style={styles.calories}>
          {calories != null
            ? `≈ ${calories} kcal`
            : weightKg
              ? ''
              : 'Agrega tu peso en Perfil para estimar calorías'}
        </Text>
      </View>
    </View>
  );
}

const styles = themedStyles(() => ({
  card: {
    backgroundColor: colors.card2,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  nameButton: {
    flex: 1,
    marginRight: spacing.sm,
  },

  name: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  stopwatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  elapsed: {
    flex: 1,
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  elapsedRunning: {
    color: colors.success,
  },

  playButton: {
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },

  pauseButton: {
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
  },

  playText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 13,
  },

  pauseText: {
    color: colors.success,
  },

  resetButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },

  minutesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  minutesInput: {
    width: 64,
    backgroundColor: colors.background,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 6,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '700',
  },

  unit: {
    color: colors.textMuted,
    fontSize: 12,
  },

  calories: {
    flex: 1,
    color: colors.xp,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
}));
