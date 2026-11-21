import React from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  ScrollView,
  Linking
} from 'react-native';
import TouchableOpacity from './PressableScale';
import ExerciseFigure from './ExerciseFigure';
import { hasFigure } from './exerciseFigures';

import { colors, radius, spacing, themedStyles } from '../constants/theme';

const MUSCLE_LABELS = {
  chest: 'Pecho',
  back: 'Espalda',
  legs: 'Piernas',
  shoulders: 'Hombros',
  arms: 'Brazos',
  core: 'Core',
  full_body: 'Cuerpo completo',
  cardio: 'Cardio',
};

const DIFFICULTY_LABELS = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

const EQUIPMENT_LABELS = {
  Dumbbells: 'Mancuernas',
  Barbell: 'Barra',
  'Cable Machine': 'Polea',
  'Leg Press Machine': 'Prensa de piernas',
  'Leg Extension Machine': 'Máquina de extensiones',
  'Leg Curl Machine': 'Máquina de femoral',
  'Pull-up Bar': 'Barra de dominadas',
  'Parallel Bars': 'Paralelas',
  'EZ Bar': 'Barra Z',
  Kettlebell: 'Pesa rusa',
};

const openLink = (url) => {
  if (url) {
    Linking.openURL(url).catch(() => {});
  }
};

// Ficha de un ejercicio con imagen de wger.de. La licencia CC BY-SA exige
// mostrar autor y licencia junto a la imagen.
export default function ExercisePreviewModal({
  exercise,
  selected,
  onToggle,
  onClose,
  onDelete,
}) {
  if (!exercise) {
    return null;
  }

  // Sin equipo significa peso corporal, salvo en cardio (correr, bicicleta...).
  const equipmentLabel = exercise.equipment
    ? EQUIPMENT_LABELS[exercise.equipment] ?? exercise.equipment
    : exercise.muscle_group === 'cardio'
      ? null
      : 'Peso corporal';

  // Los propios no tienen equipo ni dificultad: solo lo que eligió la persona.
  const details = exercise.is_custom
    ? [MUSCLE_LABELS[exercise.muscle_group] ?? exercise.muscle_group, 'Ejercicio propio']
    : [
        MUSCLE_LABELS[exercise.muscle_group] ?? exercise.muscle_group,
        equipmentLabel,
        DIFFICULTY_LABELS[exercise.difficulty] ?? exercise.difficulty,
      ].filter(Boolean);

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView>
            {hasFigure(exercise) ? (
              <ExerciseFigure name={exercise.name} />
            ) : exercise.image_url ? (
              <View style={styles.imageBox}>
                <Image
                  source={{ uri: exercise.image_url }}
                  style={styles.image}
                  resizeMode="contain"
                  accessibilityLabel={`Ilustración de ${exercise.name}`}
                />
              </View>
            ) : exercise.is_custom ? null : (
              <View style={[styles.imageBox, styles.noImage]}>
                <Text style={styles.noImageText}>Sin imagen disponible</Text>
              </View>
            )}

            {!hasFigure(exercise) && exercise.image_url ? (
              <Text style={styles.credit}>
                Imagen:{' '}
                <Text
                  style={styles.creditLink}
                  onPress={() => openLink(exercise.image_source_url)}
                >
                  {exercise.image_author || 'wger.de'} · wger.de
                </Text>
                {exercise.image_license ? (
                  <>
                    {' · '}
                    <Text
                      style={styles.creditLink}
                      onPress={() => openLink(exercise.image_license_url)}
                    >
                      {exercise.image_license}
                    </Text>
                  </>
                ) : null}
              </Text>
            ) : null}

            <Text style={styles.name}>{exercise.name}</Text>

            <View style={styles.pills}>
              {details.map((detail) => (
                <View key={detail} style={styles.pill}>
                  <Text style={styles.pillText}>{detail}</Text>
                </View>
              ))}
            </View>

            {exercise.description ? (
              <Text style={styles.description}>{exercise.description}</Text>
            ) : null}

            {exercise.is_custom && onDelete ? (
              <TouchableOpacity
                style={styles.deleteLink}
                onPress={() => onDelete(exercise)}
              >
                <Text style={styles.deleteText}>Quitar de mis ejercicios</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Cerrar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleButton, selected && styles.removeButton]}
              onPress={() => {
                onToggle(exercise);
                onClose();
              }}
            >
              <Text style={[styles.toggleText, selected && styles.removeText]}>
                {selected ? 'Quitar' : '+ Agregar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = themedStyles(() => ({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },

  sheet: {
    maxHeight: '88%',
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },

  // Las ilustraciones son dibujos sobre fondo blanco/transparente.
  imageBox: {
    height: 220,
    backgroundColor: colors.onAccent,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  noImage: {
    backgroundColor: colors.card2,
  },

  noImageText: {
    color: colors.textMuted,
    fontSize: 12,
  },

  credit: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: spacing.xs,
    textAlign: 'right',
  },

  creditLink: {
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },

  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: spacing.md,
  },

  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },

  pill: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },

  pillText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
  },

  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.md,
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  closeButton: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  closeText: {
    color: colors.textMuted,
    fontWeight: '700',
  },

  toggleButton: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  removeButton: {
    backgroundColor: colors.card2,
    borderWidth: 0.5,
    borderColor: colors.success,
  },

  toggleText: {
    color: colors.onAccent,
    fontWeight: '700',
  },

  removeText: {
    color: colors.success,
  },

  deleteLink: {
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
  },

  deleteText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
}));
