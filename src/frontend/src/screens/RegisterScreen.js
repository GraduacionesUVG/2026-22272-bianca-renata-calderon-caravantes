import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import api, { warmUpServer } from '../services/api';
import SlowServerHint from '../components/SlowServerHint';
import { AuthScreen, AuthField, AuthButton, AuthLink } from '../components/AuthKit';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    warmUpServer();
  }, []);

  const handleRegister = async () => {
    if (
      !username.trim() ||
      !fullName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      alert('Completa todos los campos.');
      return;
    }

    if (username.trim().length < 3) {
      alert('El nombre de usuario debe tener al menos 3 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 8) {
      alert('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    try {
      setLoading(true);

      await api.post('/auth/register', {
        username: username.trim(),
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      alert('Cuenta creada correctamente.');

      navigation.replace('Login');
    } catch (error) {
      console.error(error);

      const message =
        error.response?.data?.error ||
        'No fue posible crear la cuenta.';

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen subtitle="Crea tu cuenta y empieza tu racha">
      <AuthField
        label="Nombre de usuario"
        icon="at"
        tint="accent"
        placeholder="tu_usuario"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <AuthField
        label="Nombre completo"
        icon="person"
        tint="success"
        placeholder="Tu nombre y apellido"
        value={fullName}
        onChangeText={setFullName}
      />

      <AuthField
        label="Correo electrónico"
        icon="mail"
        tint="blue"
        placeholder="tu@correo.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />

      <AuthField
        label="Contraseña"
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
        tint="gold"
        password
        placeholder="Repite tu contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        autoComplete="new-password"
        textContentType="newPassword"
      />

      <View>
        <AuthButton
          label="CREAR CUENTA"
          icon="rocket"
          tint="success"
          loading={loading}
          onPress={handleRegister}
        />

        <SlowServerHint visible={loading} />

        <AuthLink
          label="Ya tengo cuenta · Iniciar sesión"
          onPress={() => navigation.replace('Login')}
        />
      </View>
    </AuthScreen>
  );
}
