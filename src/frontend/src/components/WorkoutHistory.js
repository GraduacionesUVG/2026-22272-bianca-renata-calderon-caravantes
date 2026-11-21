import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator
} from 'react-native';
import TouchableOpacity from './PressableScale';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import api from '../services/api';
import { colors, radius, spacing, themedStyles } from '../constants/theme';
import WorkoutCard, { formatVolume } from './WorkoutCard';

const PERIODS = [
  { value: 'day', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
];

const EMPTY_MESSAGES = {
  day: 'Hoy todavía no registras entrenamientos.',
  week: 'Esta semana todavía no registras entrenamientos.',
  month: 'Este mes todavía no registras entrenamientos.',
};

// Inicio del periodo en la hora local del teléfono. Las semanas empiezan en
// lunes, igual que la racha semanal.
const periodStart = (period, now = new Date()) => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === 'week') {
    const day = start.getDay();
    start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  }

  if (period === 'month') {
    start.setDate(1);
  }

  return start;
};

const dayKey = (date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const dayLabel = (date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (dayKey(date) === dayKey(today)) return 'Hoy';
  if (dayKey(date) === dayKey(yesterday)) return 'Ayer';

  const label = date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  return label.charAt(0).toUpperCase() + label.slice(1);
};

const formatTime = (date) =>
  date.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });

// "Tu actividad" en Inicio: resumen por día/semana/mes y los entrenamientos
// del periodo; cada tarjeta abre su ficha. Se recarga al volver a la pantalla.
export default function WorkoutHistory() {
  const navigation = useNavigation();
  const [workouts, setWorkouts] = useState([]);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadWorkouts = useCallback(async () => {
    try {
      setError('');

      const response = await api.get('/workouts');
      setWorkouts(response.data ?? []);
    } catch (err) {
      console.error('Error cargando historial:', err);
      setError('No fue posible cargar tu historial.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWorkouts();
    }, [loadWorkouts])
  );


  const { days, totals } = useMemo(() => {
    const start = periodStart(period);

    const inPeriod = workouts
      .map((workout) => ({
        ...workout,
        date: new Date(workout.workout_date),
      }))
      .filter((workout) => workout.date >= start);

    const groups = [];
    const byDay = {};

    inPeriod.forEach((workout) => {
      const key = dayKey(workout.date);

      if (!byDay[key]) {
        byDay[key] = { key, label: dayLabel(workout.date), workouts: [] };
        groups.push(byDay[key]);
      }

      byDay[key].workouts.push(workout);
    });

    return {
      days: groups,
      totals: {
        workouts: inPeriod.length,
        trainingDays: groups.length,
        minutes: inPeriod.reduce((sum, w) => sum + w.duration_minutes, 0),
        sets: inPeriod.reduce((sum, w) => sum + (w.summary?.total_sets ?? 0), 0),
        volume: inPeriod.reduce((sum, w) => sum + (w.summary?.volume_kg ?? 0), 0),
      },
    };
  }, [workouts, period]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tu actividad</Text>

      <View style={styles.tabs}>
        {PERIODS.map((option) => {
          const active = option.value === period;

          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setPeriod(option.value)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      ) : error ? (
        <TouchableOpacity onPress={loadWorkouts}>
          <Text style={styles.emptyText}>{error} Toca para reintentar.</Text>
        </TouchableOpacity>
      ) : totals.workouts === 0 ? (
        <Text style={styles.emptyText}>{EMPTY_MESSAGES[period]}</Text>
      ) : (
        <>
          <View style={styles.totals}>
            <View style={styles.total}>
              <Text style={styles.totalValue}>{totals.trainingDays}</Text>
              <Text style={styles.totalLabel}>
                {totals.trainingDays === 1 ? 'día' : 'días'}
              </Text>
            </View>
            <View style={styles.total}>
              <Text style={styles.totalValue}>{totals.minutes}</Text>
              <Text style={styles.totalLabel}>min</Text>
            </View>
            <View style={styles.total}>
              <Text style={styles.totalValue}>{totals.sets}</Text>
              <Text style={styles.totalLabel}>series</Text>
            </View>
            <View style={styles.total}>
              <Text style={styles.totalValue}>
                {formatVolume(totals.volume)}
              </Text>
              <Text style={styles.totalLabel}>volumen</Text>
            </View>
          </View>

          {days.map((day) => (
            <View key={day.key}>
              <Text style={styles.dayLabel}>{day.label}</Text>

              {day.workouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  dateLabel={formatTime(workout.date)}
                  showVisibility
                  onPress={() =>
                    navigation.navigate('WorkoutDetail', { workoutId: workout.id })
                  }
                />
              ))}
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  container: {
    marginTop: spacing.xl,
  },

  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
  },

  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },

  tabActive: {
    backgroundColor: colors.border,
  },

  tabText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },

  tabTextActive: {
    color: colors.text,
  },

  loading: {
    marginVertical: spacing.lg,
  },

  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },

  totals: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },

  total: {
    flex: 1,
    alignItems: 'center',
  },

  totalValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  totalLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  dayLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
}));
