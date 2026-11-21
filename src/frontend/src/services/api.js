import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// En producción la URL viene de EXPO_PUBLIC_API_URL (se fija al compilar y
// queda visible en el código público: nunca pongas secretos ahí). Sin ella,
// usamos el backend local.
const getBaseUrl = () => {
  const publicApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (publicApiUrl) {
    return publicApiUrl.replace(/\/+$/, '');
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080/api/v1';
  }

  return 'http://localhost:8080/api/v1';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 90000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Despierta el backend (en el hosting gratuito se duerme sin uso) sin
// esperar la respuesta. /health está fuera de /api/v1.
export const warmUpServer = () => {
  const healthUrl = api.defaults.baseURL.replace(/\/api\/v1$/, '') + '/health';

  fetch(healthUrl).catch(() => {});
};

// RootNavigator registra aquí cómo volver al login cuando la sesión expira.
let unauthorizedHandler = null;
let handlingUnauthorized = false;

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

export const clearSession = async () => {
  await AsyncStorage.multiRemove(['token', 'user']);
};

// Si una petición enviada con token recibe 401 (token vencido o usuario
// eliminado), cerramos la sesión una sola vez aunque fallen varias
// peticiones a la vez. Los 401 sin token (p. ej. contraseña incorrecta en
// el login) no se tocan.
api.interceptors.response.use(
  async (response) => {
    // El backend renueva el token cuando tiene más de un día; guardarlo
    // mantiene la sesión abierta mientras se use la app.
    const refreshedToken = response.headers?.['x-refreshed-token'];

    if (refreshedToken) {
      const currentToken = await AsyncStorage.getItem('token');
      const sentAuthorization = response.config?.headers?.Authorization;

      // Solo reemplazamos el token con el que se hizo esta petición: si se
      // cerró sesión o se entró con otra cuenta mientras tanto, no lo pisamos.
      if (currentToken && sentAuthorization === `Bearer ${currentToken}`) {
        await AsyncStorage.setItem('token', refreshedToken);
      }
    }

    return response;
  },
  async (error) => {
    const sentAuthorization = error.config?.headers?.Authorization;

    if (
      error.response?.status === 401 &&
      sentAuthorization &&
      !handlingUnauthorized
    ) {
      handlingUnauthorized = true;

      try {
        const currentToken = await AsyncStorage.getItem('token');

        // Si el token ya cambió o se borró, otra petición ya lo resolvió.
        if (currentToken && sentAuthorization === `Bearer ${currentToken}`) {
          await clearSession();
          alert('Tu sesión expiró. Inicia sesión nuevamente.');
          unauthorizedHandler?.();
        }
      } finally {
        handlingUnauthorized = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
