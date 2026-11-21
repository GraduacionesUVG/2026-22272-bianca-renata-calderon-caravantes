import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, useTheme } from '../constants/theme';
import { setUnauthorizedHandler } from '../services/api';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import RegisterActivityScreen from '../screens/RegisterActivityScreen';
import FeedScreen from '../screens/FeedScreen';
import ChallengesScreen from '../screens/ChallengesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ModerationScreen from '../screens/ModerationScreen';
import PublicProfileScreen from '../screens/PublicProfileScreen';
import FollowListScreen from '../screens/FollowListScreen';
import UserSearchScreen from '../screens/UserSearchScreen';
import WeeklyGoalScreen from '../screens/WeeklyGoalScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import StatsScreen from '../screens/StatsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Iconos de línea (Ionicons), siempre en el acento de la app: relleno en la
// pestaña activa y contorno atenuado en las demás.
const TAB_ICONS = {
  Inicio: 'home',
  Registrar: 'add-circle',
  Social: 'people',
  Retos: 'trophy',
  Perfil: 'person',
};

// Pestaña activa: icono dentro de una "pastilla" suave con el acento.
// Todas las pestañas comparten el mismo acento.
const TAB_COLORS = {};
const TAB_SOFT = {};

function TabIcon({ label, focused }) {
  const name = TAB_ICONS[label] ?? 'ellipse';
  const tint = colors[TAB_COLORS[label] ?? 'accent'];
  const soft = colors[TAB_SOFT[label] ?? 'accentSoft'];

  return (
    <View
      style={{
        width: 48,
        height: 36,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? soft : 'transparent',
        borderWidth: 2,
        borderColor: focused ? tint : 'transparent',
      }}
    >
      <Ionicons
        name={focused ? name : `${name}-outline`}
        size={22}
        color={focused ? tint : colors.textDim}
      />
    </View>
  );
}

function MainTabs({ onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors[TAB_COLORS[route.name] ?? 'accent'],
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 2,
          height: 72,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Registrar" component={RegisterActivityScreen} />
      <Tab.Screen name="Social" component={FeedScreen} />
      <Tab.Screen name="Retos" component={ChallengesScreen} />
      <Tab.Screen name="Perfil">
        {(props) => (
          <ProfileScreen
            {...props}
            onLogout={onLogout}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const { mode, palette } = useTheme();
  // Al cambiar de tema se vuelve a montar la navegación; guardamos dónde
  // estaba la persona para devolverla a la misma pantalla.
  const navState = useRef();

  useEffect(() => {
    checkSession();
  }, []);

  // Cuando la API detecta una sesión vencida, volvemos al login.
  useEffect(() => {
    setUnauthorizedHandler(() => setIsAuthenticated(false));

    return () => setUnauthorizedHandler(null);
  }, []);

  const checkSession = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Error verificando sesión:', error);
      setIsAuthenticated(false);
    }
  };

  // Mientras verificamos AsyncStorage evitamos mostrar Login por un instante
  if (isAuthenticated === null) {
    return null;
  }

  return (
    <NavigationContainer
      key={palette}
      initialState={navState.current}
      onStateChange={(state) => {
        navState.current = state;
      }}
      theme={{
        dark: mode === 'dark',
        colors: {
          primary: colors.accent,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          notification: colors.accent,
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main">
              {(props) => (
                <MainTabs
                  {...props}
                  onLogout={() => setIsAuthenticated(false)}
                />
              )}
            </Stack.Screen>

            <Stack.Screen
              name="Moderation"
              component={ModerationScreen}
            />

            <Stack.Screen
              name="PublicProfile"
              component={PublicProfileScreen}
            />

            <Stack.Screen
              name="FollowList"
              component={FollowListScreen}
            />

            <Stack.Screen
              name="UserSearch"
              component={UserSearchScreen}
            />

            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
            />

            <Stack.Screen
              name="WorkoutDetail"
              component={WorkoutDetailScreen}
            />

            <Stack.Screen name="Stats" component={StatsScreen} />

            <Stack.Screen name="WeeklyGoal">
              {(props) => (
                <WeeklyGoalScreen
                  {...props}
                  onLogout={() => setIsAuthenticated(false)}
                />
              )}
            </Stack.Screen>
          </>
        ) : (
          <>
            <Stack.Screen name="Login">
              {(props) => (
                <LoginScreen
                  {...props}
                  onLogin={() => setIsAuthenticated(true)}
                />
              )}
            </Stack.Screen>

            <Stack.Screen
              name="Register"
              component={RegisterScreen}
            />

            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />

            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
