import React, { useRef } from 'react';
import { Animated, Platform, Pressable } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const useNativeDriver = Platform.OS !== 'web';

// Reemplazo de TouchableOpacity: al presionar se "hunde" con un rebote.
// Mantiene el layout del estilo original (flex, márgenes, etc.).
export default function PressableScale({
  style,
  children,
  disabled,
  onPressIn,
  onPressOut,
  activeOpacity, // eslint-disable-line no-unused-vars
  ...rest
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (toValue) =>
    Animated.spring(scale, {
      toValue,
      useNativeDriver,
      speed: 40,
      bounciness: 8,
    }).start();

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        animate(0.94);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animate(1);
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
