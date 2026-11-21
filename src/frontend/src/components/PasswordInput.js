import React, { useState } from 'react';
import { View, TextInput } from 'react-native';
import TouchableOpacity from './PressableScale';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, spacing, themedStyles } from '../constants/theme';

// Campo de contraseña con un ojo para mostrarla u ocultarla. `style` es el
// del campo normal de la pantalla (fondo, borde, márgenes); el resto de props
// van al TextInput.
export default function PasswordInput({ style, ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={[style, styles.container]}>
      <TextInput
        {...inputProps}
        style={styles.input}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TouchableOpacity
        onPress={() => setVisible((value) => !value)}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.eye}
      >
        <Ionicons
          name={visible ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color={colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = themedStyles(() => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    // El padding vertical lo pone el TextInput, para que el campo entero
    // sea tocable y mida lo mismo que los demás.
    paddingVertical: 0,
  },

  input: {
    flex: 1,
    color: colors.text,
    paddingVertical: spacing.md,
    // Sin borde de foco del navegador dentro del campo compuesto.
    outlineStyle: 'none',
  },

  eye: {
    paddingLeft: spacing.sm,
  },
}));
