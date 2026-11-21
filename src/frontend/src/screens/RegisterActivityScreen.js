import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import TouchableOpacity from '../components/PressableScale';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import api from '../services/api';
import { colors, radius, spacing, themedStyles } from '../constants/theme';
import ExercisePreviewModal from '../components/ExercisePreviewModal';
import CardioRow from '../components/CardioRow';
import CustomExerciseModal from '../components/CustomExerciseModal';
import WorkoutStopwatch from '../components/WorkoutStopwatch';
import { estimateCalories, estimateStrengthCalories } from '../utils/calories';
import { shortDayLabel, toDateString } from '../utils/dates';
import { defaultWorkoutTitle } from '../utils/workoutTitle';

// Igual que MaxBackdateDays en el backend.
const MAX_BACKDATE_DAYS = 3;

const dayOptions = () =>
  Array.from({ length: MAX_BACKDATE_DAYS + 1 }, (_, daysAgo) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    return {
      daysAgo,
      date,
      label:
        daysAgo === 0 ? 'Hoy' : daysAgo === 1 ? 'Ayer' : shortDayLabel(date),
    };
  });

const MUSCLE_GROUPS = [
  { value: 'all', label: 'Todos' },
  { value: 'chest', label: 'Pecho' },
  { value: 'back', label: 'Espalda' },
  { value: 'legs', label: 'Piernas' },
  { value: 'arms', label: 'Brazos' },
  { value: 'shoulders', label: 'Hombros' },
  { value: 'core', label: 'Core' },
  { value: 'full_body', label: 'Cuerpo completo' },
  { value: 'cardio', label: 'Cardio' },
];

// El cardio se registra por minutos, no por series/repeticiones/peso.
const isCardio = (exercise) => exercise.muscle_group === 'cardio';

// Alert.alert con botones no funciona en la web.
const confirmAction = (title, message, confirmLabel, onConfirm) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
};

// Tarjeta numerada de cada paso del formulario.
function StepCard({ step, title, right, children }) {
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{step}</Text>
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
        {right ? <View style={styles.stepRight}>{right}</View> : null}
      </View>

      {children}
    </View>
  );
}

export default function RegisterActivityScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  // Mientras no se edite a mano, la duración sigue a los minutos de cardio
  // (cronómetro o escritos). Al editarla, manda lo que escribió la persona.
  const [durationEdited, setDurationEdited] = useState(false);
  const [notes, setNotes] = useState('');
  // Como en Strava: público por defecto, y se ve claramente al registrar.
  // Se conserva la última elección mientras la pantalla siga abierta.
  const [isPublic, setIsPublic] = useState(true);
  // 0 = hoy; 1-3 = días atrás, para quien olvidó registrar un entrenamiento.
  const [daysAgo, setDaysAgo] = useState(0);

  const [exercises, setExercises] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);

  const [muscleFilter, setMuscleFilter] = useState('all');
  // Con "Todos" y sin búsqueda mostramos pocos para no alargar la pantalla.
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [search, setSearch] = useState('');

  const [loadingExercises, setLoadingExercises] = useState(true);
  const [exerciseError, setExerciseError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [previewExercise, setPreviewExercise] = useState(null);
  const [creatingExercise, setCreatingExercise] = useState(false);
  // Cambiarla reinicia el cronómetro general (al guardar el entrenamiento).
  const [stopwatchKey, setStopwatchKey] = useState(0);
  // Peso del perfil, para estimar calorías del cardio.
  const [weightKg, setWeightKg] = useState(null);

  useEffect(() => {
    loadExercises();
  }, []);

  // Al volver de Perfil (donde se cambia el peso) la estimación se actualiza.
  useFocusEffect(
    useCallback(() => {
      api
        .get('/users/profile')
        .then((response) => setWeightKg(response.data?.weight_kg ?? null))
        .catch((error) => console.error('Error cargando peso:', error));
    }, [])
  );

  const loadExercises = async () => {
    try {
      setLoadingExercises(true);
      setExerciseError(null);

      const response = await api.get('/exercises');
      console.log('Ejercicios cargados:', response.data?.length);

      if (Array.isArray(response.data)) {
        setExercises(response.data);
      } else {
        setExercises([]);
      }
    } catch (error) {
      console.error('Error cargando ejercicios:', error);

      const message =
        error.response?.data?.error ||
        error.message ||
        'No fue posible cargar los ejercicios.';

      setExerciseError(message);
    } finally {
      setLoadingExercises(false);
    }
  };

  const isExerciseSelected = (exerciseId) =>
    selectedExercises.some(
      (exercise) => exercise.exercise_id === exerciseId
    );

  const toggleExercise = (exercise) => {
    if (isExerciseSelected(exercise.id)) {
      setSelectedExercises((current) =>
        current.filter(
          (item) => item.exercise_id !== exercise.id
        )
      );

      return;
    }

    addExercise(exercise);
  };

  const addExercise = (exercise) => {
    setSelectedExercises((current) => [
      ...current,
      {
        exercise_id: exercise.id,
        name: exercise.name,
        muscle_group: exercise.muscle_group,
        sets: '3',
        reps: '10',
        weight: '',
        minutes: '20',
      },
    ]);
  };

  const handleExerciseCreated = (exercise) => {
    setExercises((current) =>
      [...current, exercise].sort((a, b) => a.name.localeCompare(b.name))
    );
    addExercise(exercise);
    setCreatingExercise(false);
    setSearch('');
  };

  const deleteCustomExercise = (exercise) => {
    confirmAction(
      `¿Quitar "${exercise.name}"?`,
      'Dejará de aparecer en tu lista. Tus entrenamientos anteriores lo conservan.',
      'Quitar',
      async () => {
        try {
          await api.delete(`/exercises/${exercise.id}`);

          setExercises((current) =>
            current.filter((item) => item.id !== exercise.id)
          );
          removeExercise(exercise.id);
          setPreviewExercise(null);
        } catch (error) {
          alert(
            error.response?.data?.error ||
              'No fue posible quitar el ejercicio.'
          );
        }
      }
    );
  };

  const removeExercise = (exerciseId) => {
    setSelectedExercises((current) =>
      current.filter((item) => item.exercise_id !== exerciseId)
    );
  };

  const normalizedSearch = search.trim().toLowerCase();

  const visibleExercises = exercises.filter(
    (exercise) =>
      (muscleFilter === 'all' ||
        exercise.muscle_group === muscleFilter) &&
      (!normalizedSearch ||
        exercise.name.toLowerCase().includes(normalizedSearch))
  );

  const COLLAPSED_COUNT = 12;
  const collapsed =
    muscleFilter === 'all' &&
    !normalizedSearch &&
    !showAllExercises &&
    visibleExercises.length > COLLAPSED_COUNT;

  // Los elegidos siempre visibles, aunque la lista esté recortada.
  const shownExercises = collapsed
    ? [
        ...visibleExercises.filter((exercise) => isExerciseSelected(exercise.id)),
        ...visibleExercises.filter((exercise) => !isExerciseSelected(exercise.id)),
      ].slice(0, COLLAPSED_COUNT)
    : visibleExercises;

  // Solo mostramos los filtros de grupos que existen en el catálogo.
  const availableGroups = MUSCLE_GROUPS.filter(
    (group) =>
      group.value === 'all' ||
      exercises.some((exercise) => exercise.muscle_group === group.value)
  );

  const exercisesById = useMemo(
    () => Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises]
  );

  const strengthExercises = selectedExercises.filter((item) => !isCardio(item));
  const cardioExercises = selectedExercises.filter(isCardio);

  const cardioMinutes = cardioExercises.reduce(
    (sum, item) => sum + (Number(item.minutes) || 0),
    0
  );

  // Como en Strava: "Entrenamiento de pesas por la tarde". Se usa si el
  // nombre se deja vacío, y se puede cambiar después desde el historial.
  const suggestedTitle = defaultWorkoutTitle(selectedExercises);

  const updateExerciseField = (
    exerciseId,
    field,
    value
  ) => {
    setSelectedExercises((current) =>
      current.map((exercise) =>
        exercise.exercise_id === exerciseId
          ? {
              ...exercise,
              [field]: value,
            }
          : exercise
      )
    );
  };

  // Si el nombre se deja vacío, usamos el sugerido.
  const finalTitle = title.trim() || suggestedTitle;

  const durationIsAuto = !durationEdited && cardioMinutes > 0;
  const shownDuration = durationIsAuto ? String(cardioMinutes) : durationMinutes;
  const finalDuration = Number(shownDuration);

  // Misma estimación que hará el backend al guardar.
  const cardioCalories = cardioExercises.reduce(
    (sum, item) =>
      sum +
      (estimateCalories(
        exercisesById[item.exercise_id]?.met,
        weightKg,
        Number(item.minutes) || 0
      ) ?? 0),
    0
  );
  const strengthCalories =
    strengthExercises.length > 0
      ? estimateStrengthCalories(weightKg, finalDuration || 0, cardioMinutes) ?? 0
      : 0;
  const totalCalories = cardioCalories + strengthCalories;

  const validateWorkout = () => {
    if (selectedExercises.length === 0) {
      alert('Elige al menos un ejercicio en el paso 1.');
      return false;
    }

    if (!finalTitle) {
      alert('Ingresa un nombre para el entrenamiento.');
      return false;
    }

    if (!finalDuration || finalDuration <= 0) {
      alert('Indica cuántos minutos duró el entrenamiento.');
      return false;
    }

    if (cardioMinutes > finalDuration) {
      alert(
        `Tu cardio suma ${cardioMinutes} min; la duración total no puede ser menor.`
      );
      return false;
    }

    for (const exercise of selectedExercises) {
      if (isCardio(exercise)) {
        if (!exercise.minutes || Number(exercise.minutes) <= 0) {
          alert(`Los minutos de ${exercise.name} deben ser mayores a 0.`);
          return false;
        }

        continue;
      }

      if (
        !exercise.sets ||
        Number(exercise.sets) <= 0
      ) {
        alert(
          `Las series de ${exercise.name} deben ser mayores a 0.`
        );
        return false;
      }

      if (
        !exercise.reps ||
        Number(exercise.reps) <= 0
      ) {
        alert(
          `Las repeticiones de ${exercise.name} deben ser mayores a 0.`
        );
        return false;
      }

      if (
        exercise.weight &&
        Number(exercise.weight) < 0
      ) {
        alert(
          `El peso de ${exercise.name} no puede ser negativo.`
        );
        return false;
      }
    }

    return true;
  };

  const handleRegisterWorkout = async () => {
    if (!validateWorkout()) {
      return;
    }

    const workoutExercises = selectedExercises.map(
      (exercise, index) =>
        isCardio(exercise)
          ? {
              exercise_id: exercise.exercise_id,
              // La tabla exige series y repeticiones > 0; el dato real
              // del cardio es la duración.
              sets: 1,
              reps: 1,
              weight: null,
              duration_seconds: Math.round(Number(exercise.minutes) * 60),
              order_number: index + 1,
            }
          : {
              exercise_id: exercise.exercise_id,
              sets: Number(exercise.sets),
              reps: Number(exercise.reps),
              weight:
                exercise.weight === ''
                  ? null
                  : Number(exercise.weight),
              duration_seconds: null,
              order_number: index + 1,
            }
    );

    const payload = {
      title: finalTitle,
      duration_minutes: finalDuration,
      notes: notes.trim() || null,
      is_public: isPublic,
      // Hoy no se envía: el backend usa la hora exacta del registro.
      workout_date:
        daysAgo > 0 ? toDateString(dayOptions()[daysAgo].date) : undefined,
      exercises: workoutExercises,
    };

    try {
      setSaving(true);

      const response = await api.post(
        '/workouts',
        payload
      );

      resetForm();

      // Como en Strava: ficha con el resumen de lo que acabas de hacer. Si hubo
      // logro (semana de racha o reto), la ficha lo celebra con confeti; el
      // backend no lo envía si el usuario desactivó las celebraciones.
      navigation.navigate('WorkoutDetail', {
        workoutId: response.data.workout.id,
        justSaved: true,
        celebration: response.data.celebration ?? undefined,
      });

    } catch (error) {
      console.error(
        'Error registrando entrenamiento:',
        error
      );

      const message =
        error.response?.data?.error ||
        'No fue posible registrar el entrenamiento.';

      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDurationMinutes('');
    setDurationEdited(false);
    setDaysAgo(0);
    setNotes('');
    setSelectedExercises([]);
    setMuscleFilter('all');
    setShowAllExercises(false);
    setSearch('');
    setStopwatchKey((key) => key + 1);
  };

  const renderExercisePicker = () => {
    if (loadingExercises) {
      return <ActivityIndicator size="small" color={colors.accent} />;
    }

    if (exerciseError || exercises.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {exerciseError || 'No se encontraron ejercicios en el catálogo.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadExercises}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar ejercicio"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          keyboardShouldPersistTaps="handled"
        >
          {availableGroups.map((group) => {
            const active = muscleFilter === group.value;

            return (
              <TouchableOpacity
                key={group.value}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setMuscleFilter(group.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {group.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {visibleExercises.length === 0 ? (
          <Text style={styles.emptyFilterText}>
            Ningún ejercicio coincide con la búsqueda.
          </Text>
        ) : (
          <View style={styles.exerciseGrid}>
            {shownExercises.map((exercise) => {
              const selected = isExerciseSelected(exercise.id);

              return (
                <View
                  key={exercise.id}
                  style={[
                    styles.exerciseChip,
                    selected && styles.exerciseChipSelected,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.exerciseChipToggle}
                    onPress={() => toggleExercise(exercise)}
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={[
                        styles.exerciseChipText,
                        selected && styles.exerciseChipTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {/* Ionicons es un Text, así que puede ir dentro de la etiqueta. */}
                      <Ionicons name={selected ? 'checkmark' : 'add'} size={13} />{' '}
                      {exercise.name}
                      {exercise.is_custom ? ' · propio' : ''}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.exerciseInfoButton}
                    onPress={() => setPreviewExercise(exercise)}
                    accessibilityLabel={`Ver cómo se hace ${exercise.name}`}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={selected ? colors.accent : colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {collapsed ? (
          <TouchableOpacity
            style={styles.showAllButton}
            onPress={() => setShowAllExercises(true)}
          >
            <Text style={styles.showAllText}>
              Ver los {visibleExercises.length} ejercicios ▾
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setCreatingExercise(true)}
        >
          <Text style={styles.createText}>
            {normalizedSearch && visibleExercises.length === 0
              ? `+ Crear "${search.trim()}"`
              : '+ ¿No lo encuentras? Crea tu propio ejercicio'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.previewHint}>
          Toca el ícono de información para ver cómo se hace cada ejercicio.
        </Text>
      </>
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      // El cronómetro (hijo 1) se queda fijo arriba al hacer scroll.
      stickyHeaderIndices={[1]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Registrar</Text>
        <Text style={styles.subtitle}>
          Elige tus ejercicios, completa los detalles y guarda.
        </Text>
      </View>

      <View style={styles.stopwatchSticky}>
        <WorkoutStopwatch
          key={stopwatchKey}
          onUseMinutes={(minutes) => {
            setDurationEdited(true);
            setDurationMinutes(String(minutes));
          }}
        />
      </View>

      <StepCard
        step="1"
        title="¿Qué entrenaste?"
        right={
          selectedExercises.length > 0 ? (
            <Text style={styles.counter}>
              {selectedExercises.length}{' '}
              {selectedExercises.length === 1 ? 'elegido' : 'elegidos'}
            </Text>
          ) : null
        }
      >
        {renderExercisePicker()}
      </StepCard>

      {selectedExercises.length > 0 && (
        <StepCard step="2" title="Series, peso y tiempo">
          {strengthExercises.length > 0 && (
            <>
              <View style={styles.detailHeader}>
                <Text style={[styles.detailHeaderText, styles.detailNameColumn]}>
                  Ejercicio
                </Text>
                <Text style={[styles.detailHeaderText, styles.detailInputColumn]}>
                  Series
                </Text>
                <Text style={[styles.detailHeaderText, styles.detailInputColumn]}>
                  Reps
                </Text>
                <Text style={[styles.detailHeaderText, styles.detailInputColumn]}>
                  Kg
                </Text>
                <View style={styles.detailRemoveColumn} />
              </View>

              {strengthExercises.map((exercise) => (
                <View key={exercise.exercise_id} style={styles.detailRow}>
                  <TouchableOpacity
                    style={styles.detailNameColumn}
                    onPress={() =>
                      setPreviewExercise(exercisesById[exercise.exercise_id])
                    }
                  >
                    <Text style={styles.detailName} numberOfLines={2}>
                      {exercise.name}{' '}
                      <Ionicons
                        name="information-circle-outline"
                        size={13}
                        color={colors.textMuted}
                      />
                    </Text>
                  </TouchableOpacity>

                  <TextInput
                    style={[styles.smallInput, styles.detailInputColumn]}
                    value={exercise.sets}
                    onChangeText={(value) =>
                      updateExerciseField(exercise.exercise_id, 'sets', value)
                    }
                    keyboardType="numeric"
                    accessibilityLabel={`Series de ${exercise.name}`}
                  />

                  <TextInput
                    style={[styles.smallInput, styles.detailInputColumn]}
                    value={exercise.reps}
                    onChangeText={(value) =>
                      updateExerciseField(exercise.exercise_id, 'reps', value)
                    }
                    keyboardType="numeric"
                    accessibilityLabel={`Repeticiones de ${exercise.name}`}
                  />

                  <TextInput
                    style={[styles.smallInput, styles.detailInputColumn]}
                    value={exercise.weight}
                    placeholder="—"
                    placeholderTextColor={colors.textMuted}
                    onChangeText={(value) =>
                      updateExerciseField(exercise.exercise_id, 'weight', value)
                    }
                    keyboardType="decimal-pad"
                    accessibilityLabel={`Peso en kg de ${exercise.name}`}
                  />

                  <TouchableOpacity
                    style={styles.detailRemoveColumn}
                    onPress={() => removeExercise(exercise.exercise_id)}
                    accessibilityLabel={`Quitar ${exercise.name}`}
                  >
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {cardioExercises.length > 0 && (
            <View style={strengthExercises.length > 0 && styles.cardioBlock}>
              {cardioExercises.map((exercise) => (
                <CardioRow
                  key={exercise.exercise_id}
                  exercise={exercise}
                  met={exercisesById[exercise.exercise_id]?.met}
                  weightKg={weightKg}
                  onChangeMinutes={(value) =>
                    updateExerciseField(exercise.exercise_id, 'minutes', value)
                  }
                  onRemove={() => removeExercise(exercise.exercise_id)}
                  onPreview={() =>
                    setPreviewExercise(exercisesById[exercise.exercise_id])
                  }
                />
              ))}
            </View>
          )}
        </StepCard>
      )}

      <StepCard step={selectedExercises.length > 0 ? '3' : '2'} title="Detalles">
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          placeholder={suggestedTitle || 'Ej. Día de pierna'}
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>¿Cuándo?</Text>
            <View style={styles.dayRow}>
              {dayOptions().map((option) => {
                const active = option.daysAgo === daysAgo;

                return (
                  <TouchableOpacity
                    key={option.daysAgo}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                    onPress={() => setDaysAgo(option.daysAgo)}
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        active && styles.dayChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {daysAgo > 0 ? (
          <Text style={styles.hint}>
            Se mostrará que lo registraste después (máximo {MAX_BACKDATE_DAYS}{' '}
            días atrás).
          </Text>
        ) : null}

        <Text style={styles.label}>Duración total (min)</Text>
        <TextInput
          style={styles.input}
          placeholder="60"
          placeholderTextColor={colors.textMuted}
          value={shownDuration}
          onChangeText={(value) => {
            setDurationEdited(true);
            setDurationMinutes(value);
          }}
          keyboardType="numeric"
        />

        {durationIsAuto ? (
          <Text style={styles.hint}>
            {strengthExercises.length > 0
              ? 'Tomado de tu cardio. Súmale el tiempo de fuerza si quieres.'
              : 'Tomado de tu cardio; puedes cambiarlo.'}
          </Text>
        ) : durationEdited && cardioMinutes > 0 ? (
          <TouchableOpacity
            onPress={() => {
              setDurationEdited(false);
              setDurationMinutes('');
            }}
          >
            <Text style={styles.hintLink}>
              Usar el tiempo del cardio ({cardioMinutes} min)
            </Text>
          </TouchableOpacity>
        ) : null}

        {selectedExercises.length > 0 ? (
          weightKg ? (
            <View style={styles.caloriesBox}>
              <Text style={styles.caloriesTotal}>
                ≈ {totalCalories} kcal en total
              </Text>
              {strengthExercises.length > 0 && cardioExercises.length > 0 ? (
                <Text style={styles.caloriesBreakdown}>
                  Fuerza ≈ {strengthCalories} · Cardio ≈ {cardioCalories}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.hint}>
              Agrega tu peso en Perfil para estimar las calorías.
            </Text>
          )
        ) : null}

        <Text style={styles.label}>Notas (opcional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="¿Cómo te sentiste?"
          placeholderTextColor={colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>¿Quién puede verlo?</Text>
        <View style={styles.visibilityRow}>
          {[
            { value: true, label: 'Público' },
            { value: false, label: 'Privado' },
          ].map((option) => {
            const active = option.value === isPublic;

            return (
              <TouchableOpacity
                key={option.label}
                style={[
                  styles.visibilityOption,
                  active && styles.visibilityOptionActive,
                ]}
                onPress={() => setIsPublic(option.value)}
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.visibilityOptionText,
                    active && styles.visibilityOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.hint}>
          {isPublic
            ? 'Aparecerá en tu perfil para la comunidad (sin tus notas).'
            : 'Solo tú lo verás.'}
        </Text>
      </StepCard>

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleRegisterWorkout}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Guardar entrenamiento</Text>
        )}
      </TouchableOpacity>

      <ExercisePreviewModal
        exercise={previewExercise}
        selected={
          previewExercise ? isExerciseSelected(previewExercise.id) : false
        }
        onToggle={toggleExercise}
        onClose={() => setPreviewExercise(null)}
        onDelete={deleteCustomExercise}
      />

      <CustomExerciseModal
        visible={creatingExercise}
        initialName={search.trim()}
        initialMuscleGroup={muscleFilter}
        onCreated={handleExerciseCreated}
        onClose={() => setCreatingExercise(false)}
      />

    </ScrollView>
  );
}

const styles = themedStyles(() => ({
  stepCard: {
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },

  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  stepBadgeText: {
    color: colors.onAccent,
    fontSize: 12,
    fontWeight: '700',
  },

  stepTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },

  stepRight: {
    marginLeft: spacing.sm,
  },

  row: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },

  showAllButton: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 0.5,
    borderColor: colors.border,
  },

  showAllText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },

  rowItem: {
    flex: 1,
  },

  cardioBlock: {
    marginTop: spacing.md,
  },

  hintLink: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },

  hint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },

  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 50,
  },

  header: {
    marginBottom: spacing.xl,
  },

  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
  },

  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
    lineHeight: 19,
  },

  counter: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },

  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },

  input: {
    backgroundColor: colors.card2,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    marginBottom: spacing.md,
  },

  notesInput: {
    minHeight: 90,
  },

  dayRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  dayChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.card2,
    alignItems: 'center',
  },

  dayChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },

  dayChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },

  dayChipTextActive: {
    color: colors.accent,
  },

  visibilityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  visibilityOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.card2,
    alignItems: 'center',
  },

  visibilityOptionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },

  visibilityOptionText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },

  visibilityOptionTextActive: {
    color: colors.accent,
  },


  searchInput: {
    backgroundColor: colors.card2,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  filterRow: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },

  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },

  filterChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },

  filterChipText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  filterChipTextActive: {
    color: colors.accent,
  },

  emptyFilterText: {
    color: colors.textMuted,
    fontSize: 12,
    paddingVertical: spacing.sm,
  },

  exerciseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },

  exerciseChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card2,
  },

  exerciseChipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },

  exerciseChipToggle: {
    flexShrink: 1,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.sm,
  },

  exerciseInfoButton: {
    paddingRight: spacing.md,
    paddingLeft: spacing.xs,
    paddingVertical: spacing.sm,
  },

  stopwatchSticky: {
    // Fondo opaco para que el contenido no se vea por detrás al hacer scroll.
    backgroundColor: colors.background,
    paddingBottom: spacing.md,
  },

  caloriesBox: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },

  caloriesTotal: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  caloriesBreakdown: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  createButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },

  createText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },

  previewHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.md,
  },

  exerciseChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },

  exerciseChipTextSelected: {
    color: colors.accent,
  },

  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },

  detailHeaderText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card2,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },

  detailNameColumn: {
    flex: 1,
    textAlign: 'left',
  },

  detailInputColumn: {
    width: 48,
  },

  // Ocupa el ancho de las tres columnas Series/Reps/Kg (3 × 48 + 2 huecos).

  detailRemoveColumn: {
    width: 24,
    alignItems: 'center',
  },

  detailName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },

  smallInput: {
    backgroundColor: colors.background,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.xs,
    color: colors.text,
    textAlign: 'center',
  },

  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 14,
  },

  errorContainer: {
    backgroundColor: colors.card2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginVertical: spacing.xs,
  },

  errorText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },

  retryButtonText: {
    color: colors.onAccent,
    fontSize: 12,
    fontWeight: '700',
  },
}));
