import React from 'react';
import { View } from 'react-native';
import { Player } from '@lottiefiles/react-lottie-player';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors } from '../constants/theme';

const fire = require('../assets/streak-fire.json');

// Proporción de la animación (170 x 241).
const ASPECT = 170.47 / 241.4;

// Versión web de la llama: usa el reproductor de Lottie directamente. El
// envoltorio de `lottie-react-native` no encuentra este paquete en web aunque
// esté instalado, y así nos ahorramos esa capa.
export default function FlameAnimation({ size = 48, lit = true, source = fire }) {
  const width = Math.round(size * ASPECT);

  if (!lit) {
    return (
      <View style={{ width, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="flame-outline" size={Math.round(size * 0.7)} color={colors.textDim} />
      </View>
    );
  }

  return <Player autoplay loop src={source} style={{ width, height: size }} />;
}
