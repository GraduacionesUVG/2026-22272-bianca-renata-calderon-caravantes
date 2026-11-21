import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useWindowDimensions
} from 'react-native';
import ReAnimated, {
  Easing as ReEasing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import TouchableOpacity from './PressableScale';

import { colors, radius, spacing, themedStyles } from '../constants/theme';

const mascot = require('../assets/mascot.png');

const CONFETTI_COLORS = [
  '#FF8F6B',
  '#F5C978',
  '#6FD6B0',
  '#9A9CFF',
  '#F0788C',
  '#FFFFFF',
];

const PIECES = 70;

// En web el driver nativo no existe; Animated usa JS.
const useNativeDriver = Platform.OS !== 'web';

const random = (min, max) => min + Math.random() * (max - min);

// Pieza de confeti: la animación corre en el hilo de UI con Reanimated.
function ConfettiPiece({ piece, height }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      piece.delay,
      withTiming(1, { duration: piece.duration, easing: ReEasing.out(Easing.quad) })
    );
  }, [piece, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.85, 1], [1, 1, 0]),
    transform: [
      { translateY: progress.value * (height + 40) },
      { translateX: progress.value * piece.drift },
      { rotate: `${progress.value * piece.spins * 360}deg` },
    ],
  }));

  return (
    <ReAnimated.View
      style={[
        {
          position: 'absolute',
          top: -20,
          left: piece.left,
          width: piece.size,
          height: piece.round ? piece.size : piece.size * 1.6,
          borderRadius: piece.round ? piece.size / 2 : 2,
          backgroundColor: piece.color,
        },
        animatedStyle,
      ]}
    />
  );
}

// Confeti que cae una vez desde arriba. Cada pieza tiene su propio color,
// tamaño, deriva lateral, giro y velocidad.
function Confetti({ width, height }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, index) => ({
        key: index,
        left: random(0, width),
        drift: random(-60, 60),
        size: random(6, 11),
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        spins: random(2, 6),
        duration: random(2200, 3600),
        delay: random(0, 600),
        round: Math.random() < 0.3,
      })),
    [width]
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((piece) => (
        <ConfettiPiece key={piece.key} piece={piece} height={height} />
      ))}
    </View>
  );
}

// Celebración con confeti y la mascota: semana de racha cumplida o reto
// completado. Se puede desactivar en Perfil → Ajustes.
export default function CelebrationOverlay({ celebration, onClose }) {
  const { width, height } = useWindowDimensions();
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!celebration) {
      return;
    }

    pop.setValue(0);
    Animated.spring(pop, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver,
    }).start();
  }, [celebration, pop]);

  if (!celebration) {
    return null;
  }

  const lines = [];

  if (celebration.streak_weeks > 0) {
    lines.push(
      celebration.streak_weeks === 1
        ? 'Cumpliste tu meta semanal. Tu racha empieza hoy.'
        : `Meta semanal cumplida. Llevas ${celebration.streak_weeks} semanas de racha.`
    );
  }

  (celebration.completed_challenges ?? []).forEach((title) => {
    lines.push(`Completaste el reto "${title}".`);
  });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Confetti width={width} height={height} />

        <Animated.View
          style={[
            styles.card,
            {
              transform: [
                {
                  scale: pop.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  }),
                },
              ],
              opacity: pop,
            },
          ]}
        >
          <View style={styles.mascotGlow}>
            <Image
              source={mascot}
              style={styles.mascot}
              resizeMode="contain"
              accessibilityLabel="Mascota de Gymify celebrando"
            />
          </View>

          <Text style={styles.title}>¡Lo lograste!</Text>

          {lines.map((line) => (
            <Text key={line} style={styles.message}>
              {line}
            </Text>
          ))}

          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Continuar</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = themedStyles(() => ({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.xl,
    alignItems: 'center',
  },

  // La mascota es negra: un círculo cálido detrás la separa del fondo oscuro.
  mascotGlow: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },

  mascot: {
    width: 120,
    height: 140,
  },

  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },

  message: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  button: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  buttonText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 15,
  },
}));
