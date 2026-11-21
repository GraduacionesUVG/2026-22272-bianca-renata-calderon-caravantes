import React from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, themedStyles } from '../constants/theme';
import AuthHero, { Bubbles } from './AuthHero';
import FadeInView from './FadeInView';
import PasswordInput from './PasswordInput';
import PressableScale from './PressableScale';

// Pantalla de autenticación: fondo de burbujas, gatito y contenido que
// aparece escalonado.
export function AuthScreen({ subtitle, children }) {
  return (
    <View style={styles.screen}>
      <Bubbles />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <AuthHero subtitle={subtitle} />
        {React.Children.toArray(children)
          .filter(Boolean)
          .map((child, i) => (
            <FadeInView key={i} delay={120 + i * 90}>
              {child}
            </FadeInView>
          ))}
      </ScrollView>
    </View>
  );
}

// Campo con etiqueta, icono y borde de color.
export function AuthField({ label, icon, tint = 'blue', password, inputStyle, ...inputProps }) {
  const Input = password ? PasswordInput : TextInput;
  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, { borderColor: colors[tint] }]}>
        {icon ? <Ionicons name={icon} size={20} color={colors[tint]} /> : null}
        <Input
          style={[styles.fieldInput, inputStyle]}
          placeholderTextColor={colors.textMuted}
          {...inputProps}
        />
      </View>
    </View>
  );
}

// Botón grande con relieve. `tint`: accent | success | blue | purple | gold.
export function AuthButton({ label, icon = 'arrow-forward', tint = 'accent', loading, disabled, onPress }) {
  const dark = colors[`${tint}Dark`];
  return (
    <PressableScale
      onPress={onPress}
      disabled={loading || disabled}
      style={[
        styles.button,
        { backgroundColor: colors[tint], borderBottomColor: dark },
        (loading || disabled) && { opacity: 0.65 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <View style={styles.buttonInner}>
          <Text style={styles.buttonText}>{label}</Text>
          {icon ? <Ionicons name={icon} size={20} color={colors.onAccent} /> : null}
        </View>
      )}
    </PressableScale>
  );
}

// Botón secundario (contorno).
export function AuthLink({ label, tint = 'blue', onPress, disabled, icon }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} style={styles.link}>
      <View style={styles.buttonInner}>
        {icon ? <Ionicons name={icon} size={18} color={colors[tint]} /> : null}
        <Text style={[styles.linkText, { color: colors[tint] }]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

export function AuthHint({ children }) {
  return <Text style={styles.hint}>{children}</Text>;
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 40,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  fieldInput: {
    flex: 1,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    borderWidth: 0,
    backgroundColor: 'transparent',
    marginBottom: 0,
  },
  button: {
    borderRadius: 16,
    borderBottomWidth: 4,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  buttonText: { color: colors.onAccent, fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  link: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  linkText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
}));
