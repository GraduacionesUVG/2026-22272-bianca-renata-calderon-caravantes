import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import TouchableOpacity from '../components/PressableScale';
import Ionicons from '@expo/vector-icons/Ionicons';

import api from '../services/api';
import { colors, radius, spacing, themedStyles } from '../constants/theme';
import CelebrationOverlay from '../components/CelebrationOverlay';
import { formatVolume } from '../components/WorkoutCard';
import { isSameDay, weekdayName } from '../utils/dates';
import IconLabel from '../components/IconLabel';

const mascot = require('../assets/mascot.png');

const formatWorkoutDate = (value) => {
  const date = new Date(value);
  const day = date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const time = date.toLocaleTimeString('es-MX', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time}`;
};

const exerciseDetail = (exercise) => {
  if (exercise.muscle_group === 'cardio') {
    return `${Math.round((exercise.duration_seconds ?? 0) / 60)} min`;
  }

  const weight = exercise.weight ? ` · ${exercise.weight} kg` : ' · peso corporal';
  return `${exercise.sets} × ${exercise.reps}${weight}`;
};

// Ficha de un entrenamiento, estilo Strava. Dos usos:
// - justSaved: resumen justo después de registrar; "Listo" lleva a Inicio y,
//   si hubo logro, se muestra la celebración encima.
// - Detalle desde Inicio o un perfil. El dueño puede renombrarlo y cambiar
//   su visibilidad; otros solo lo ven si es público, y sin las notas.
export default function WorkoutDetailScreen({ route, navigation }) {
  const { workoutId, justSaved = false, celebration: initialCelebration } =
    route.params ?? {};

  const [workout, setWorkout] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [celebration, setCelebration] = useState(initialCelebration ?? null);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const loadWorkout = useCallback(async () => {
    try {
      setError('');
      const response = await api.get(`/workouts/${workoutId}`);
      setWorkout(response.data.workout);
      setIsOwner(response.data.is_owner);
    } catch (err) {
      console.error('Error cargando entrenamiento:', err);
      setError(
        err.response?.status === 404
          ? 'Este entrenamiento no existe o es privado.'
          : 'No fue posible cargar el entrenamiento.'
      );
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  const goHome = () => navigation.navigate('Main', { screen: 'Inicio' });

  const saveTitle = async () => {
    const title = titleDraft.trim();

    if (!title || title === workout.title) {
      setEditingTitle(false);
      return;
    }

    try {
      setSaving(true);
      const response = await api.patch(`/workouts/${workout.id}`, { title });
      setWorkout((current) => ({ ...current, title: response.data.title }));
      setEditingTitle(false);
    } catch (err) {
      alert(err.response?.data?.error || 'No fue posible cambiar el nombre.');
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async () => {
    const isPublic = !workout.is_public;

    try {
      setSaving(true);
      await api.patch(`/workouts/${workout.id}/visibility`, { is_public: isPublic });
      setWorkout((current) => ({ ...current, is_public: isPublic }));
    } catch (err) {
      alert('No fue posible cambiar la visibilidad.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.success} />
      </View>
    );
  }

  if (error || !workout) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const summary = workout.summary ?? {};
  const stats = [
    { label: 'Duración', value: `${workout.duration_minutes} min` },
    summary.total_sets > 0 && { label: 'Series', value: summary.total_sets },
    summary.volume_kg > 0 && { label: 'Volumen', value: formatVolume(summary.volume_kg) },
    summary.cardio_minutes > 0 && { label: 'Cardio', value: `${summary.cardio_minutes} min` },
    workout.calories_burned > 0 && { label: 'kcal totales', value: `≈ ${workout.calories_burned}` },
  ].filter(Boolean);

  // Desglose solo si hubo de las dos: si no, coincide con el total.
  const strengthCalories = workout.strength_calories ?? 0;
  const cardioCalories = workout.calories_burned - strengthCalories;
  const caloriesBreakdown =
    strengthCalories > 0 && cardioCalories > 0
      ? `Fuerza ≈ ${strengthCalories} kcal · Cardio ≈ ${cardioCalories} kcal (estimación)`
      : null;

  const loggedLater = !isSameDay(workout.workout_date, workout.created_at);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        {justSaved ? (
          <View style={styles.savedBanner}>
            <Image source={mascot} style={styles.bannerMascot} resizeMode="contain" />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Entrenamiento guardado</Text>
              <Text style={styles.bannerSubtitle}>Así quedó tu sesión.</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹ Volver</Text>
          </TouchableOpacity>
        )}

        {editingTitle ? (
          <View style={styles.titleEditRow}>
            <TextInput
              style={styles.titleInput}
              value={titleDraft}
              onChangeText={setTitleDraft}
              maxLength={100}
              autoFocus
              editable={!saving}
              onSubmitEditing={saveTitle}
              returnKeyType="done"
              accessibilityLabel="Nombre del entrenamiento"
            />
            <TouchableOpacity style={styles.titleAction} onPress={saveTitle} accessibilityLabel="Guardar nombre">
              <Ionicons name="checkmark" size={22} color={colors.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.titleAction}
              onPress={() => setEditingTitle(false)}
              accessibilityLabel="Cancelar"
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.titleRow}>
            <Text style={styles.title}>{workout.title}</Text>
            {isOwner ? (
              <TouchableOpacity
                onPress={() => {
                  setTitleDraft(workout.title);
                  setEditingTitle(true);
                }}
                accessibilityLabel="Cambiar nombre"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="pencil" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <Text style={styles.date}>{formatWorkoutDate(workout.workout_date)}</Text>
        {loggedLater ? (
          <IconLabel icon="time-outline" style={styles.loggedLater}>
            Registrado el {weekdayName(workout.created_at)}
          </IconLabel>
        ) : null}

        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statTile}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {caloriesBreakdown ? (
          <Text style={styles.caloriesBreakdown}>{caloriesBreakdown}</Text>
        ) : null}

        <Text style={styles.sectionTitle}>Ejercicios</Text>
        <View style={styles.card}>
          {(workout.exercises ?? []).map((exercise, index) => (
            <View
              key={exercise.id}
              style={[styles.exerciseRow, index > 0 && styles.exerciseDivider]}
            >
              <Ionicons
                name={exercise.muscle_group === 'cardio' ? 'walk-outline' : 'barbell-outline'}
                size={16}
                color={colors.textMuted}
                style={styles.exerciseIcon}
              />
              <Text style={styles.exerciseName} numberOfLines={1}>
                {exercise.exercise_name}
              </Text>
              <Text style={styles.exerciseDetail}>{exerciseDetail(exercise)}</Text>
            </View>
          ))}
        </View>

        {isOwner && workout.notes ? (
          <>
            <Text style={styles.sectionTitle}>Notas</Text>
            <View style={styles.card}>
              <Text style={styles.notes}>{workout.notes}</Text>
            </View>
          </>
        ) : null}

        {isOwner ? (
          <TouchableOpacity
            style={[styles.visibilityChip, workout.is_public && styles.visibilityChipPublic]}
            onPress={toggleVisibility}
            disabled={saving}
          >
            <IconLabel
              icon={workout.is_public ? 'globe-outline' : 'lock-closed-outline'}
              color={workout.is_public ? colors.success : colors.textMuted}
              textStyle={styles.visibilityText}
            >
              {workout.is_public
                ? 'Público · visible en tu perfil · cambiar'
                : 'Privado · solo tú lo ves · cambiar'}
            </IconLabel>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {justSaved ? (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryButton} onPress={goHome}>
            <Text style={styles.primaryText}>Listo</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <CelebrationOverlay celebration={celebration} onClose={() => setCelebration(null)} />
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },

  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  errorText: {
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },

  backText: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 14,
  },

  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.success,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  bannerMascot: {
    width: 54,
    height: 64,
    marginRight: spacing.md,
  },

  bannerText: {
    flex: 1,
  },

  bannerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },

  bannerSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  title: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },

  titleEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  titleInput: {
    flex: 1,
    backgroundColor: colors.card2,
    borderWidth: 0.5,
    borderColor: colors.success,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },

  titleAction: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  date: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },

  loggedLater: {
    marginTop: spacing.xs,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  statTile: {
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  statValue: {
    color: colors.success,
    fontSize: 18,
    fontWeight: '700',
  },

  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  caloriesBreakdown: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.sm,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },

  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },

  exerciseDivider: {
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },

  exerciseIcon: {
    marginRight: spacing.sm,
  },

  exerciseName: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  exerciseDetail: {
    color: colors.textMuted,
    fontSize: 13,
    marginLeft: spacing.sm,
  },

  notes: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    paddingVertical: spacing.md,
  },

  visibilityChip: {
    alignSelf: 'flex-start',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.card2,
  },

  visibilityChipPublic: {
    borderColor: colors.success,
  },

  visibilityText: {
    fontSize: 12,
    fontWeight: '600',
  },

  footer: {
    padding: spacing.lg,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },

  primaryButton: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  primaryText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: '700',
  },

  secondaryButton: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },

  secondaryText: {
    color: colors.textMuted,
    fontWeight: '700',
  },
}));
