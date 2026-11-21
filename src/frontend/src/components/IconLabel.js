import React from 'react';
import { View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, spacing, themedStyles } from '../constants/theme';

// Icono de línea seguido de un texto, en el mismo color. Sustituye a los
// emojis delante de etiquetas, que cada sistema dibuja distinto.
export default function IconLabel({
  icon,
  children,
  color = colors.textMuted,
  size = 14,
  style,
  textStyle,
}) {
  return (
    <View style={[styles.row, style]}>
      <Ionicons name={icon} size={size} color={color} style={styles.icon} />
      <Text style={[styles.text, { color }, textStyle]}>{children}</Text>
    </View>
  );
}

const styles = themedStyles(() => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  icon: {
    marginRight: spacing.xs + 2,
  },

  text: {
    fontSize: 12,
    flexShrink: 1,
  },
}));
