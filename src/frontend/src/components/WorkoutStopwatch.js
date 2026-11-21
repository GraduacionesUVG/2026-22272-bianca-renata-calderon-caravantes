import React from 'react';
import { View, Text } from 'react-native';
import TouchableOpacity from './PressableScale';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radius, spacing, themedStyles } from '../constants/theme';
import { formatElapsed, useStopwatch } from '../utils/stopwatch';

// Cronómetro general del entrenamiento: queda fijo arriba mientras se hacen
// sentadillas, zancadas, un wall sit... Al pausarlo se puede usar su tiempo
// como duración total. Para reiniciarlo desde fuera, cambia su `key`.
export default function WorkoutStopwatch({ onUseMinutes }) {
  const { elapsedMs, running, toggle, reset } = useStopwatch();

  const minutes = Math.round(elapsedMs / 60000);
  const canUse = !running && minutes >= 1;

  return (
    <View style={styles.bar}>
      <Ionicons name="stopwatch-outline" size={18} color={colors.textMuted} />

      <Text
        style={[styles.elapsed, running && styles.elapsedRunning]}
        accessibilityLabel={`Cronómetro ${formatElapsed(elapsedMs)}`}
      >
        {formatElapsed(elapsedMs)}
      </Text>

      {canUse ? (
        <TouchableOpacity
          style={styles.useButton}
          onPress={() => onUseMinutes(minutes)}
        >
          <Text style={styles.useText}>Usar {minutes} min</Text>
        </TouchableOpacity>
      ) : null}

      {elapsedMs > 0 && !running ? (
        <TouchableOpacity
          style={styles.resetButton}
          onPress={reset}
          accessibilityLabel="Reiniciar cronómetro"
        >
          <Ionicons name="refresh" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={[styles.playButton, running && styles.pauseButton]}
        onPress={toggle}
      >
        <Text style={[styles.playText, running && styles.pauseText]}>
          <Ionicons name={running ? 'pause' : 'play'} size={12} />{' '}
          {running ? 'Pausar' : elapsedMs > 0 ? 'Seguir' : 'Iniciar'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = themedStyles(() => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },

  elapsed: {
    flex: 1,
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  elapsedRunning: {
    color: colors.success,
  },

  useButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  useText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },

  playButton: {
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

}));
