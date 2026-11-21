import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Platform, Text, View } from 'react-native';
import { colors, themedStyles } from '../constants/theme';

const mascot = require('../assets/mascot.png');
const useNativeDriver = Platform.OS !== 'web';

const loop = (value, from, to, duration, delay = 0) =>
  Animated.loop(
    Animated.sequence([
      Animated.timing(value, { toValue: to, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver }),
      Animated.timing(value, { toValue: from, duration, easing: Easing.inOut(Easing.sin), useNativeDriver }),
    ])
  );

// Burbujas de colores que flotan al fondo.
const BUBBLES = [
  { key: 'a', color: 'accent', size: 190, top: -60, left: -70, dur: 3800 },
  { key: 'b', color: 'blue', size: 130, top: 90, right: -50, dur: 3200 },
  { key: 'c', color: 'purple', size: 90, top: 250, left: -30, dur: 4200 },
  { key: 'd', color: 'success', size: 70, top: 20, right: 60, dur: 3500 },
  { key: 'e', color: 'gold', size: 56, top: 210, right: 24, dur: 3000 },
];

const TITLE_COLORS = ['accent', 'gold', 'success', 'blue', 'purple', 'red'];

export function Bubbles() {
  const anims = useRef(BUBBLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const running = anims.map((v, i) => loop(v, 0, 1, BUBBLES[i].dur, i * 250));
    running.forEach((a) => a.start());
    return () => running.forEach((a) => a.stop());
  }, [anims]);

  return (
    <View pointerEvents="none" style={styles.bubbleLayer}>
      {BUBBLES.map((b, i) => (
        <Animated.View
          key={b.key}
          style={{
            position: 'absolute',
            top: b.top,
            left: b.left,
            right: b.right,
            width: b.size,
            height: b.size,
            borderRadius: b.size / 2,
            backgroundColor: colors[b.color],
            opacity: 0.18,
            transform: [
              { translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) },
              { scale: anims[i].interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

// Gatito de Gymify dentro de un "icono" circular que rebota y respira.
export default function AuthHero({ title = 'Gymify', subtitle }) {
  const bob = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, friction: 5, tension: 70, useNativeDriver }).start();
    const a = loop(bob, 0, 1, 1100);
    const b = loop(halo, 0, 1, 1600);
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [bob, halo, entrance]);

  return (
    <View style={styles.hero}>
      <Animated.View
        style={[
          styles.haloOuter,
          {
            opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.1] }),
            transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.iconCircle,
          {
            transform: [
              { scale: entrance },
              { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
              { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) },
            ],
          },
        ]}
      >
        <Image source={mascot} style={styles.mascot} resizeMode="contain" />
      </Animated.View>

      <Text style={styles.title}>
        {title.split('').map((ch, i) => (
          <Text key={i} style={{ color: colors[TITLE_COLORS[i % TITLE_COLORS.length]] }}>
            {ch}
          </Text>
        ))}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = themedStyles(() => ({
  bubbleLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  hero: { alignItems: 'center', marginBottom: 28 },
  haloOuter: {
    position: 'absolute',
    top: 6,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.accent,
  },
  iconCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.card,
    borderWidth: 4,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 14,
  },
  mascot: { width: 96, height: 108, marginTop: 8 },
  title: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  subtitle: { color: colors.textMuted, fontSize: 15, fontWeight: '700', marginTop: 4 },
}));
