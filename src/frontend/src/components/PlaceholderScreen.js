import React from 'react';
import { View, Text } from 'react-native';
import { colors, spacing, themedStyles } from '../constants/theme';

// Pantalla temporal usada mientras se implementan las funcionalidades
// de cada sprint. Reemplazar por la UI definitiva correspondiente.
export default function PlaceholderScreen({ title, sprint }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {sprint && <Text style={styles.subtitle}>Pendiente — Sprint {sprint}</Text>}
    </View>
  );
}

const styles = themedStyles(() => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
  },
}));
