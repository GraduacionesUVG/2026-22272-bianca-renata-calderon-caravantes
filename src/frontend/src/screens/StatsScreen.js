import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import TouchableOpacity from '../components/PressableScale';
import { useFocusEffect } from '@react-navigation/native';

import api from '../services/api';
import WorkoutStatsCard from '../components/WorkoutStatsCard';
import { colors, spacing, themedStyles } from '../constants/theme';

// Estadísticas completas; Inicio muestra solo el resumen del mes.
export default function StatsScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [hasWeight, setHasWeight] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [statsResponse, profileResponse] = await Promise.all([
        api.get('/users/stats'),
        api.get('/users/profile').catch(() => null),
      ]);
      setStats(statsResponse.data);
      if (profileResponse) {
        setHasWeight(profileResponse.data?.weight_kg != null);
      }
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
      setError(
        err.response?.data?.error || 'No fue posible cargar las estadísticas.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Volver"
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Estadísticas</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.muted}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <WorkoutStatsCard stats={stats} hasWeight={hasWeight} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  backText: { color: colors.text, fontSize: 32, lineHeight: 34 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  container: { padding: spacing.lg },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  muted: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  retry: { marginTop: spacing.md, padding: spacing.sm },
  retryText: { color: colors.accent, fontWeight: '700' },
}));
