import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { AuthScreen, AuthField, AuthButton, AuthLink, AuthHint } from '../components/AuthKit';
import { colors } from '../constants/theme';
import api from '../services/api';

// Debe coincidir con resetCodeCooldown del backend.
const RESEND_COOLDOWN_SECONDS = 60;

export default function ResetPasswordScreen({ navigation, route }) {
  const email = route.params?.email ?? '';

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (resendIn <= 0) {
      return undefined;
    }

    const timer = setTimeout(() => setResendIn((value) => value - 1), 1000);

    return () => clearTimeout(timer);
  }, [resendIn]);

  const handleReset = async () => {
    if (!/^\d{6}$/.test(code)) {
      alert('El código debe tener 6 dígitos.');
      return;
    }

    if (!password || !confirmPassword) {
      alert('Escribe y confirma tu nueva contraseña.');
      return;
    }

    if (password.length < 8) {
      alert('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    try {
      setLoading(true);

      await api.post('/auth/reset-password', {
        email,
        code,
        new_password: password,
      });

      alert('Contraseña actualizada. Ya puedes iniciar sesión.');

      navigation.popToTop();
    } catch (error) {
      console.error(error);

      const message =
        error.response?.data?.error ||
        'No fue posible actualizar la contraseña.';

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) {
      return;
    }

    try {
      await api.post('/auth/forgot-password', { email });

      setCode('');
      setResendIn(RESEND_COOLDOWN_SECONDS);
      alert('Te enviamos un código nuevo. El anterior ya no es válido.');
    } catch (error) {
      console.error(error);

      const message =
        error.response?.data?.error ||
        'No fue posible reenviar el código.';

      alert(message);
    }
  };

  return (
    <AuthScreen subtitle="Crea tu nueva contraseña">
      <AuthHint>
        Escribe el código que enviamos a{' '}
        <Text style={{ color: colors.text, fontWeight: '800' }}>{email}</Text>. Caduca en 15 minutos.
      </AuthHint>

      <AuthField
        label="Código de 6 dígitos"
        icon="keypad"
        tint="gold"
        inputStyle={{ fontSize: 22, fontWeight: '800', letterSpacing: 6, textAlign: 'center' }}
        placeholder="000000"
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
        keyboardType="number-pad"
        maxLength={6}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
      />

      <AuthField
        label="Nueva contraseña"
        icon="lock-closed"
        tint="purple"
        password
        placeholder="Mínimo 8 caracteres"
        value={password}
        onChangeText={setPassword}
        autoComplete="new-password"
        textContentType="newPassword"
      />

      <AuthField
        label="Confirmar contraseña"
        icon="shield-checkmark"
        tint="success"
        password
        placeholder="Repite tu contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        autoComplete="new-password"
        textContentType="newPassword"
      />

      <AuthButton
        label="CAMBIAR CONTRASEÑA"
        icon="checkmark-circle"
        tint="success"
        loading={loading}
        onPress={handleReset}
      />

      <AuthLink
        icon="refresh"
        label={resendIn > 0 ? `Reenviar código en ${resendIn} s` : 'Reenviar código'}
        disabled={resendIn > 0}
        onPress={handleResend}
      />

      <AuthLink
        icon="arrow-back"
        label="Volver a iniciar sesión"
        onPress={() => navigation.popToTop()}
      />
    </AuthScreen>
  );
}
