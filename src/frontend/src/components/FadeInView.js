import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform } from 'react-native';

const useNativeDriver = Platform.OS !== 'web';

// Aparece deslizándose hacia arriba; `delay` permite escalonar elementos.
export default function FadeInView({ delay = 0, distance = 18, style, children }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 480,
      delay,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver,
    }).start();
  }, [delay, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
