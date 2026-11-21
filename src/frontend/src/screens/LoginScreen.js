import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  ActivityIndicator
} from 'react-native';
import TouchableOpacity from '../components/PressableScale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing, themedStyles } from '../constants/theme';
import api, { warmUpServer } from '../services/api';
import SlowServerHint from '../components/SlowServerHint';
import PasswordInput from '../components/PasswordInput';
import AuthHero, { Bubbles } from '../components/AuthHero';
import FadeInView from '../components/FadeInView';

// En el piloto (hosting sin correo) la recuperación está desactivada en el
// backend; se fija al compilar con EXPO_PUBLIC_PASSWORD_RESET_ENABLED=false.
const PASSWORD_RESET_ENABLED =
  process.env.EXPO_PUBLIC_PASSWORD_RESET_ENABLED !== 'false';

const PASSWORD_RESET_DISABLED_MESSAGE =
  'Durante el piloto, la recuperación de contraseña por correo está desactivada. ' +
  'Escríbele a la responsable del piloto y ella restablecerá tu contraseña.';

// Solo se guarda el correo: la contraseña nunca se almacena en la app (en la
// web quedaría sin cifrar en el navegador). La sesión ya se mantiene abierta.
const REMEMBERED_EMAIL_KEY = 'rememberedEmail';

export default function LoginScreen({ navigation, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mientras la persona escribe, el servidor ya va despertando.
  useEffect(() => {
    warmUpServer();

    AsyncStorage.getItem(REMEMBERED_EMAIL_KEY)
      .then((saved) => {
        if (saved) {
          // Sin pisar lo que ya haya empezado a escribir.
          setEmail((current) => current || saved);
          setRememberEmail(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      alert('Ingresa tu correo y contraseña.');
      return;
    }

    try {
      setLoading(true);

      const response = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      const { token, user } = response.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      if (rememberEmail) {
        await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim().toLowerCase());
      } else {
        await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      onLogin();
    } catch (error) {
      console.error(error);

      const message =
        error.response?.data?.error ||
        'No fue posible iniciar sesión.';

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Bubbles />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <AuthHero subtitle="Entrena. Comparte. Crece." />

        <FadeInView delay={150}>
          <Text style={styles.label}>Correo electrónico</Text>
          <View style={[styles.field, styles.fieldBlue]}>
            <Ionicons name="mail" size={20} color={colors.blue} />
            <TextInput
              style={styles.fieldInput}
              placeholder="tu@correo.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </View>
        </FadeInView>

        <FadeInView delay={260}>
          <Text style={styles.label}>Contraseña</Text>
          <View style={[styles.field, styles.fieldPurple]}>
            <Ionicons name="lock-closed" size={20} color={colors.purple} />
            <PasswordInput
              style={styles.fieldInput}
              placeholder="Tu contraseña"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              autoComplete="current-password"
              textContentType="password"
            />
          </View>
        </FadeInView>

        <FadeInView delay={370}>
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberEmail((value) => !value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rememberEmail }}
            >
              <View style={[styles.checkbox, rememberEmail && styles.checkboxChecked]}>
                {rememberEmail ? (
                  <Ionicons name="checkmark" size={14} color={colors.onAccent} />
                ) : null}
              </View>
              <Text style={styles.rememberText}>Recordar mi correo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                PASSWORD_RESET_ENABLED
                  ? navigation?.navigate?.('ForgotPassword')
                  : alert(PASSWORD_RESET_DISABLED_MESSAGE)
              }
            >
              <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>
        </FadeInView>

        <FadeInView delay={480}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.buttonInner}>
                <Text style={styles.buttonText}>ENTRAR</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.onAccent} />
              </View>
            )}
          </TouchableOpacity>

          <SlowServerHint visible={loading} />

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation?.navigate?.('Register')}
          >
            <Text style={styles.registerText}>
              Crear cuenta nueva
            </Text>
          </TouchableOpacity>
        </FadeInView>
      </ScrollView>
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 48,
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
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  fieldBlue: { borderColor: colors.blue },
  fieldPurple: { borderColor: colors.purple },
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
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  rememberText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  forgot: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.onAccent,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },
  registerButton: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  registerText: {
    color: colors.blue,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
}));
