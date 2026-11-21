import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TextInput
} from 'react-native';
import TouchableOpacity from '../components/PressableScale';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import api from '../services/api';
import { colors, radius, spacing, themedStyles } from '../constants/theme';

const REPORT_LABELS = {
  inappropriate_content: 'Contenido inapropiado',
  harassment: 'Acoso',
  spam: 'Spam',
  misinformation: 'Desinformación',
  other: 'Otro',
};

export default function ModerationScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [notes, setNotes] = useState({});

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get('/reports/pending');
      // El backend responde { reports: [...] }; Go envía null si está vacío.
      setReports(response.data?.reports ?? []);
    } catch (error) {
      console.error('Error cargando reportes:', error);

      if (error.response?.status === 403) {
        alert('No tienes permisos para acceder a moderación.');
        navigation.goBack();
        return;
      }

      alert(
        error.response?.data?.error ||
          'No fue posible cargar los reportes pendientes.'
      );
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  // La decisión se aplica a la publicación, así que todos sus reportes
  // salen de la cola a la vez.
  const removePostReports = (postId) => {
    const removedIds = reports
      .filter((currentReport) => currentReport.post_id === postId)
      .map((currentReport) => currentReport.id);

    setReports((currentReports) =>
      currentReports.filter(
        (currentReport) => currentReport.post_id !== postId
      )
    );

    setNotes((currentNotes) => {
      const nextNotes = { ...currentNotes };
      removedIds.forEach((reportId) => delete nextNotes[reportId]);
      return nextNotes;
    });
  };

  const handleReview = async (report, status) => {
    try {
      setReviewingId(report.id);

      await api.put(`/reports/${report.id}`, {
        status,
        notes: (notes[report.id] ?? '').trim(),
      });

      removePostReports(report.post_id);

      alert(
        status === 'resolved'
          ? 'Publicación retirada.'
          : 'Publicación aprobada: vuelve a ser visible.'
      );
    } catch (error) {
      console.error('Error revisando reporte:', error);

      // Otro moderador pudo haberlo eliminado; ya no tiene sentido mostrarlo.
      if (error.response?.status === 404) {
        removePostReports(report.post_id);
      }

      alert(
        error.response?.data?.error ||
          'No fue posible actualizar el reporte.'
      );
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>Moderación</Text>
          <Text style={styles.subtitle}>Reportes pendientes</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.red} />
          <Text style={styles.mutedText}>Cargando reportes...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {reports.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="checkmark-circle-outline"
                size={32}
                color={colors.success}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyTitle}>
                No hay reportes pendientes
              </Text>
              <Text style={styles.mutedText}>
                Todo está al día por ahora.
              </Text>
            </View>
          ) : (
            reports.map((report) => {
              const reviewing = reviewingId === report.id;

              return (
                <View key={report.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {REPORT_LABELS[report.report_type] ??
                          report.report_type}
                      </Text>
                    </View>

                    <Text style={styles.status}>
                      {report.report_status}
                    </Text>
                  </View>

                  <Text style={styles.label}>
                    Publicación de @{report.post_username}
                  </Text>
                  <Text style={styles.description}>
                    {report.post_content}
                  </Text>

                  <Text style={styles.label}>Reportado por</Text>
                  <Text style={styles.value}>
                    @{report.reporter_name}
                  </Text>

                  <Text style={styles.label}>Descripción</Text>
                  <Text style={styles.description}>
                    {report.description}
                  </Text>

                  <Text style={styles.label}>Notas del moderador</Text>

                  <TextInput
                    style={styles.notesInput}
                    value={notes[report.id] ?? ''}
                    onChangeText={(value) =>
                      setNotes((currentNotes) => ({
                        ...currentNotes,
                        [report.id]: value,
                      }))
                    }
                    placeholder="Añade una nota opcional..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    maxLength={500}
                    editable={!reviewing}
                  />

                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[
                        styles.dismissButton,
                        reviewing && styles.disabledButton,
                      ]}
                      disabled={reviewing}
                      onPress={() =>
                        handleReview(report, 'dismissed')
                      }
                    >
                      <Text style={styles.dismissText}>
                        Aprobar
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.resolveButton,
                        reviewing && styles.disabledButton,
                      ]}
                      disabled={reviewing}
                      onPress={() =>
                        handleReview(report, 'resolved')
                      }
                    >
                      <Text style={styles.resolveText}>
                        {reviewing ? 'Guardando...' : 'Retirar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = themedStyles(() => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

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

  backText: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 34,
  },

  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },

  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  container: {
    padding: spacing.lg,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },

  card: {
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },

  badge: {
    backgroundColor: colors.redSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },

  badgeText: {
    color: colors.red,
    fontSize: 11,
    fontWeight: '700',
  },

  status: {
    color: colors.textMuted,
    fontSize: 11,
  },

  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },

  value: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  description: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },

  notesInput: {
    minHeight: 80,
    backgroundColor: colors.card2,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    padding: spacing.md,
    textAlignVertical: 'top',
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  dismissButton: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  dismissText: {
    color: colors.textMuted,
    fontWeight: '700',
  },

  resolveButton: {
    flex: 1,
    backgroundColor: colors.red,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  resolveText: {
    color: colors.onAccent,
    fontWeight: '700',
  },

  disabledButton: {
    opacity: 0.5,
  },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },

  emptyIcon: {
    marginBottom: spacing.sm,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },

  mutedText: {
    color: colors.textMuted,
    fontSize: 12,
  },
}));
