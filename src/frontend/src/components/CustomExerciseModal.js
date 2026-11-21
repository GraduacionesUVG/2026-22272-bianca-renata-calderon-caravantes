import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  ActivityIndicator
} from 'react-native';
import TouchableOpacity from './PressableScale';

import api from '../services/api';
import { colors, radius, spacing, themedStyles } from '../constants/theme';

const MUSCLE_GROUPS = [
  { value: 'legs', label: 'Piernas' },
  { value: 'chest', label: 'Pecho' },
  { value: 'back', label: 'Espalda' },
  { value: 'arms', label: 'Brazos' },
  { value: 'shoulders', label: 'Hombros' },
  { value: 'core', label: 'Core' },
  { value: 'full_body', label: 'Cuerpo completo' },
  { value: 'cardio', label: 'Cardio' },
];

// Crea un ejercicio propio (solo lo ve quien lo crea). onCreated recibe el
// ejercicio guardado.
export default function CustomExerciseModal({
  visible,
  initialName,
  initialMuscleGroup,
  onCreated,
  onClose,
}) {
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('legs');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Al abrirse, parte de lo que se estaba buscando y del filtro activo.
  useEffect(() => {
    if (visible) {
      setName(initialName || '');
      setMuscleGroup(
        MUSCLE_GROUPS.some((group) => group.value === initialMuscleGroup)
          ? initialMuscleGroup
          : 'legs'
      );
      setError(null);
    }
  }, [visible, initialName, initialMuscleGroup]);

  const handleSave = async () => {
    if (name.trim().length < 2) {
      setError('Escribe el nombre del ejercicio.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await api.post('/exercises', {
        name: name.trim(),
        muscle_group: muscleGroup,
      });

      onCreated(response.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          'No fue posible crear el ejercicio.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Nuevo ejercicio</Text>
          <Text style={styles.subtitle}>
            Solo tú lo verás en tu lista. Podrás usarlo como cualquier otro.
          </Text>

          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Hip Thrust"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={60}
            autoFocus
          />

          <Text style={styles.label}>Grupo muscular</Text>
          <View style={styles.groups}>
            {MUSCLE_GROUPS.map((group) => {
              const active = group.value === muscleGroup;

              return (
                <TouchableOpacity
                  key={group.value}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setMuscleGroup(group.value)}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {group.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {muscleGroup === 'cardio' ? (
            <Text style={styles.hint}>
              Se registrará por minutos. Sin datos de intensidad no podemos
              estimar sus calorías.
            </Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveText}>Crear y agregar</Text>
              )}
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
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },

  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },

  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
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

  groups: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },

  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.card2,
  },

  chipActive: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },

  chipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },

  chipTextActive: {
    color: colors.success,
  },

  hint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: spacing.sm,
  },

  error: {
    color: colors.success,
    fontSize: 12,
    marginTop: spacing.md,
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  cancelButton: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  cancelText: {
    color: colors.textMuted,
    fontWeight: '700',
  },

  saveButton: {
    flex: 2,
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveText: {
    color: colors.onAccent,
    fontWeight: '700',
  },
}));
