import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, spacing, themedStyles } from '../constants/theme';
import { FIGURES, FRONT_SEGMENTS, GROUND_Y, SEGMENTS } from './exerciseFigures';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function Segment({ joints, from, to, color, width }) {
  const props = useAnimatedProps(() => ({
    x1: joints.value[from].x,
    y1: joints.value[from].y,
    x2: joints.value[to].x,
    y2: joints.value[to].y,
  }));

  return (
    <AnimatedLine
      animatedProps={props}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
}

function Dot({ joints, name, r, fill, stroke, strokeWidth = 0 }) {
  const props = useAnimatedProps(() => ({
    cx: joints.value[name].x,
    cy: joints.value[name].y,
  }));

  return (
    <AnimatedCircle
      animatedProps={props}
      r={r}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

// Animación en bucle de un ejercicio. Devuelve null si no hay figura para él,
// para que quien la use muestre su alternativa.
export default function ExerciseFigure({ name, height = 240 }) {
  const figure = FIGURES[name];
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = 0;
    // `cycle`: movimiento continuo (correr, pedalear); si no, ida y vuelta.
    t.value = figure?.cycle
      ? withRepeat(
          withTiming(1, { duration: figure.duration ?? 800, easing: Easing.linear }),
          -1,
          false
        )
      : withRepeat(
          withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
          -1,
          true
        );
    return () => cancelAnimation(t);
  }, [name, t, figure]);

  const joints = useDerivedValue(() => (figure ? figure.pose(t.value) : null));

  if (!figure) {
    return null;
  }

  const headDot = (
    <Dot joints={joints} name="head" r={9} fill={colors.card2} stroke={colors.textMuted} strokeWidth={4} />
  );
  const first = figure.pose(0);
  const hasWeight = first.weight != null;
  const hasWeightR = first.weightR != null;

  return (
    <View style={[styles.box, { height }]} accessibilityLabel={`Animación de ${figure.label}`}>
      <Svg width="100%" height="100%" viewBox={figure.viewBox ?? '0 -10 200 170'} preserveAspectRatio="xMidYMid meet">
        <Line
          x1="10"
          y1={GROUND_Y}
          x2="190"
          y2={GROUND_Y}
          stroke={colors.border}
          strokeWidth={3}
          strokeLinecap="round"
        />

        {(figure.rings ?? []).map(([cx, cy, r]) => (
          <Circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={colors.textDim}
            strokeWidth={4}
          />
        ))}

        {figure.headBehind ? headDot : null}

        {(figure.props ?? []).map(([from, to]) => (
          <Segment
            key={`${from}-${to}`}
            joints={joints}
            from={from}
            to={to}
            color={colors.textDim}
            width={5}
          />
        ))}

        {(figure.view === 'front' ? FRONT_SEGMENTS : SEGMENTS).map(([from, to, key]) => (
          <Segment
            key={key}
            joints={joints}
            from={from}
            to={to}
            color={figure.muscle.includes(key) ? colors.accent : colors.textMuted}
            width={figure.muscle.includes(key) ? 8 : 7}
          />
        ))}


        {figure.headBehind ? null : headDot}

        {hasWeight ? <Dot joints={joints} name="weight" r={6} fill={colors.accentDark} /> : null}
        {hasWeightR ? <Dot joints={joints} name="weightR" r={6} fill={colors.accentDark} /> : null}
      </Svg>

      <Text style={styles.caption}>
        {figure.note ??
          'Zona resaltada: músculos que más trabajan. Es una referencia del recorrido, no de la técnica.'}
      </Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  box: {
    backgroundColor: colors.card2,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    // Espacio propio para la nota (hasta 3 líneas): así no tapa los pies ni el suelo.
    paddingBottom: 44,
  },
  caption: {
    position: 'absolute',
    bottom: 4,
    left: spacing.md,
    right: spacing.md,
    color: colors.textDim,
    fontSize: 10,
    textAlign: 'center',
  },
}));
