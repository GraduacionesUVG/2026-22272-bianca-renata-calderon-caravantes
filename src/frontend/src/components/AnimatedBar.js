import React, { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

// Relleno de barra de progreso que crece con animación al montar y al cambiar
// el valor. `percent` va de 0 a 100. Se dibuja dentro de la barra de fondo.
export default function AnimatedBar({ percent = 0, style, duration = 800 }) {
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = withTiming(Math.max(0, Math.min(100, percent)), {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [percent, duration, value]);

  const animatedStyle = useAnimatedStyle(() => ({ width: `${value.value}%` }));

  return <Animated.View style={[style, animatedStyle]} />;
}
