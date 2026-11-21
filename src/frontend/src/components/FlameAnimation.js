import React from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors } from '../constants/theme';

const fire = require('../assets/streak-fire.json');

// Proporción de la animación (170 x 241).
const ASPECT = 170.47 / 241.4;

// Llama de la racha (iOS y Android). Encendida (animada) cuando hay racha;
// apagada, un contorno atenuado. En web se usa FlameAnimation.web.js.
export default function FlameAnimation({ size = 48, lit = true, source = fire }) {
  const width = Math.round(size * ASPECT);

  if (!lit) {
    return (
      <View style={{ width, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="flame-outline" size={Math.round(size * 0.7)} color={colors.textDim} />
      </View>
    );
  }

  return (
    <LottieView
      source={source}
      autoPlay
      loop
      style={{ width, height: size }}
    />
  );
}
