import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  View,
  Text,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import TouchableOpacity from '../components/PressableScale';

import api, { clearSession } from '../services/api';

const mascot = require('../assets/mascot.png');
import { colors, radius, spacing, themedStyles } from '../constants/theme';

const GOAL_OPTIONS = [1, 2, 3, 4, 5, 6, 7];
const RECOMMENDED_GOAL = 3;

const GOAL_HINTS = {
  1: 'Para empezar con calma',
  2: 'Ideal si tienes poco tiempo',
  3: 'Recomendado para crear el hábito',
  4: 'Un ritmo constante',
  5: 'Para quien ya tiene rutina',
  6: 'Exigente',
  7: 'Todos los días',
};

// Se usa en dos modos:
// - onboarding: tras iniciar sesión sin meta; no se puede salir sin elegir.
// - edición: desde el perfil, con botón para volver.
export default function WeeklyGoalScreen({ route, navigation, onLogout }) {
  const onboarding = route.params?.onboarding ?? false;
  const name = route.params?.name;
  const initialGoal = route.params?.currentGoal ?? RECOMMENDED_GOAL;

  const [goal, setGoal] = useState(initialGoal);
  const [saving, setSaving] = useState(false);

  // Permite salir de la pantalla de onboarding solo después de guardar.
  const savedRef = useRef(false);

  useEffect(() => {
    if (!onboarding) {
      return undefined;
    }

    navigation.setOptions({ gestureEnabled: false });

    return navigation.addListener('beforeRemove', (event) => {
      if (!savedRef.current) {
        event.preventDefault();
      }
    });
  }, [navigation, onboarding]);

  // Salida del onboarding si la cuenta no es la correcta.
  const handleLogout = async () => {
    try {
      savedRef.current = true;
      await clearSession();
      onLogout?.();
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      await api.put('/users/weekly-goal', { weekly_goal: goal });

      savedRef.current = true;
      navigation.goBack();
    } catch (error) {
      console.error('Error guardando meta semanal:', error);

      alert(
        error.response?.data?.error ||
          'No fue posible guardar tu meta semanal.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
    >
      {!onboarding && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>‹ Volver</Text>
        </TouchableOpacity>
      )}

      <Image
        source={mascot}
        style={styles.mascot}
        resizeMode="contain"
        accessibilityLabel="Mascota de Gymify"
      />

      {onboarding && name ? (
        <Text style={styles.greeting}>Hola, {name}</Text>
      ) : null}

      <Text style={styles.title}>
        {onboarding ? '¿Cuántos días quieres entrenar por semana?' : 'Meta semanal'}
      </Text>

      <Text style={styles.subtitle}>
        Tu racha suma una semana cada vez que cumples tu meta (de lunes a
        domingo). Los días de descanso no la interrumpen.
      </Text>

      <View style={styles.optionsGrid}>
        {GOAL_OPTIONS.map((option) => {
          const selected = option === goal;

          return (
            <TouchableOpacity
              key={option}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => setGoal(option)}
              disabled={saving}
            >
              <Text
                style={[
                  styles.optionNumber,
                  selected && styles.optionNumberSelected,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryValue}>
          {goal} {goal === 1 ? 'día' : 'días'} por semana
        </Text>
        <Text style={styles.summaryHint}>{GOAL_HINTS[goal]}</Text>
      </View>

      {!onboarding && (
        <Text style={styles.note}>
          El cambio aplica desde esta semana. Las semanas anteriores
          conservan la meta que tenían.
        </Text>
      )}

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.disabledButton]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveText}>
            {onboarding ? 'Empezar' : 'Guardar meta'}
          </Text>
        )}
      </TouchableOpacity>

      {onboarding && (
        <TouchableOpacity
          style={styles.logoutLink}
          onPress={handleLogout}
          disabled={saving}
        >
          <Text style={styles.logoutLinkText}>
            ¿No eres tú? <Text style={styles.logoutLinkAction}>Cerrar sesión</Text>
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = themedStyles(() => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    padding: spacing.lg,
    paddingTop: spacing.xl * 2,
    paddingBottom: 40,
  },

  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
  },

  backText: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 14,
  },

  mascot: {
    width: 110,
    height: 130,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },

  greeting: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },

  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },

  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },

  optionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },

  option: {
    width: 40,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  optionSelected: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },

  optionNumber: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },

  optionNumberSelected: {
    color: colors.onAccent,
  },

  summaryCard: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },

  summaryValue: {
    color: colors.success,
    fontSize: 18,
    fontWeight: '700',
  },

  summaryHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },

  note: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: spacing.lg,
  },

  saveButton: {
    minHeight: 48,
    marginTop: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledButton: {
    opacity: 0.6,
  },

  logoutLink: {
    alignSelf: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },

  logoutLinkText: {
    color: colors.textMuted,
    fontSize: 12,
  },

  logoutLinkAction: {
    color: colors.success,
    fontWeight: '700',
  },

  saveText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: '700',
  },
}));
