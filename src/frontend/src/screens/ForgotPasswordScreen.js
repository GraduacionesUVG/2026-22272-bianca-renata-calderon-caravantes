import React, { useState } from 'react';
import { AuthScreen, AuthField, AuthButton, AuthLink, AuthHint } from '../components/AuthKit';
import api from '../services/api';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      alert('Ingresa tu correo electrónico.');
      return;
    }

    try {
      setLoading(true);

      await api.post('/auth/forgot-password', { email: normalizedEmail });

      alert('Si existe una cuenta con ese correo, te enviamos un código de 6 dígitos.');

      navigation.navigate('ResetPassword', { email: normalizedEmail });
    } catch (error) {
      console.error(error);

      const message =
        error.response?.data?.error ||
        'No fue posible enviar el código.';

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen subtitle="Recupera tu contraseña">
      <AuthHint>
        Escribe el correo de tu cuenta y te enviaremos un código para crear una nueva contraseña.
      </AuthHint>

      <AuthField
        label="Correo electrónico"
        icon="mail"
        tint="blue"
        placeholder="tu@correo.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <AuthButton
        label="ENVIAR CÓDIGO"
        icon="paper-plane"
        tint="blue"
        loading={loading}
        onPress={handleSendCode}
      />

      <AuthLink
        icon="arrow-back"
        label="Volver a iniciar sesión"
        onPress={() => navigation.goBack()}
      />
    </AuthScreen>
  );
}
