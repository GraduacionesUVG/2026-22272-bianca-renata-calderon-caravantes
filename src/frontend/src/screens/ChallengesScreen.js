import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import TouchableOpacity from '../components/PressableScale';
import AnimatedBar from '../components/AnimatedBar';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import api from '../services/api';
import { colors, radius, spacing, themedStyles } from '../constants/theme';
import RankingView from '../components/RankingView';
import IconLabel from '../components/IconLabel';
import { challengeTimeLabel } from '../utils/dates';

export default function ChallengesScreen() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('challenges');

  const loadChallenges = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      setError('');

      const response = await api.get('/challenges');
      setChallenges(response.data ?? []);
    } catch (err) {
      console.error('Error cargando retos:', err);

      setError(
        err.response?.data?.error ||
          'No fue posible cargar los retos.'
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadChallenges();
    }, [])
  );

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadChallenges(false);
    } finally {
      setRefreshing(false);
    }
  };

  const handleJoin = async (challenge) => {
    if (joiningId) return;

    try {
      setJoiningId(challenge.id);

      await api.post(`/challenges/${challenge.id}/join`);

      setChallenges((currentChallenges) =>
        currentChallenges.map((currentChallenge) =>
          currentChallenge.id === challenge.id
            ? {
                ...currentChallenge,
                joined: true,
              }
            : currentChallenge
        )
      );

      Alert.alert(
        'Te uniste al reto',
        `Te uniste a "${challenge.title}". Tus próximos entrenamientos contarán para este reto.`
      );

      await loadChallenges(false);
    } catch (err) {
      console.error('Error uniéndose al reto:', err);

      Alert.alert(
        'No fue posible unirte',
        err.response?.data?.error ||
          'Inténtalo nuevamente.'
      );
    } finally {
      setJoiningId(null);
    }
  };

  const sortedChallenges = useMemo(() => {
    return [...challenges].sort((a, b) => {
      const getPriority = (challenge) => {
        if (challenge.completed) return 2;
        if (challenge.joined) return 0;
        return 1;
      };

      return getPriority(a) - getPriority(b);
    });
  }, [challenges]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          color={colors.accent}
        />

        <Text style={styles.loadingText}>
          Cargando retos...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.accent}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.logo}>Gymify</Text>

        <Text style={styles.title}>
          {activeTab === 'challenges' ? 'Retos' : 'Ranking'}
        </Text>

        <Text style={styles.subtitle}>
          {activeTab === 'challenges'
            ? 'Entrena, cumple metas y gana XP.'
            : 'Compara tu progreso con la comunidad.'}
        </Text>
      </View>

      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'challenges' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('challenges')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'challenges' && styles.activeTabText,
            ]}
          >
            Retos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'ranking' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('ranking')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'ranking' && styles.activeTabText,
            ]}
          >
            Ranking
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'ranking' ? (
        <RankingView />
      ) : (
        <>
          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => loadChallenges()}
              >
                <Text style={styles.retryButtonText}>
                  Intentar de nuevo
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!error && sortedChallenges.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="trophy-outline"
                size={32}
                color={colors.textMuted}
                style={styles.emptyIcon}
              />

              <Text style={styles.emptyTitle}>
                No hay retos disponibles
              </Text>

              <Text style={styles.emptyText}>
                Cuando aparezcan nuevos retos podrás
                encontrarlos aquí.
              </Text>
            </View>
          ) : null}

          {sortedChallenges.map((challenge) => {
            const progress = Math.min(
              challenge.progress ?? 0,
              challenge.goal
            );

            const progressPercentage =
              challenge.goal > 0
                ? Math.min(
                    (progress / challenge.goal) * 100,
                    100
                  )
                : 0;

            const isJoining = joiningId === challenge.id;

            return (
              <View
                key={challenge.id}
                style={[
                  styles.challengeCard,
                  challenge.completed &&
                    styles.completedCard,
                ]}
              >
                <View style={styles.cardTopRow}>
                  <Text style={styles.challengeTitle}>
                    {challenge.title}
                  </Text>

                  <Text
                    style={[
                      styles.statusText,
                      challenge.joined &&
                        styles.activeStatusText,
                      challenge.completed &&
                        styles.completedStatusText,
                    ]}
                  >
                    {challenge.completed
                      ? 'Completado'
                      : challenge.joined
                        ? 'En progreso'
                        : 'Disponible'}
                  </Text>
                </View>

                {challenge.description ? (
                  <Text style={styles.description}>
                    {challenge.description}
                  </Text>
                ) : null}

                {(() => {
                  const time = challengeTimeLabel(challenge);

                  return (
                    <Text
                      style={[
                        styles.timeLabel,
                        time.urgent && !challenge.completed && styles.timeLabelUrgent,
                      ]}
                    >
                      {time.label}
                    </Text>
                  );
                })()}

                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>
                    Progreso
                  </Text>

                  <Text style={styles.progressValue}>
                    {progress} / {challenge.goal}{' '}
                    entrenamientos
                  </Text>
                </View>

                <View style={styles.progressBarBackground}>
                  <AnimatedBar
                    percent={progressPercentage}
                    style={[
                      styles.progressBarFill,
                      challenge.completed &&
                        styles.completedProgress,
                    ]}
                  />
                </View>

                <View style={styles.rewardRow}>
                  <View>
                    <Text style={styles.rewardLabel}>
                      Recompensa
                    </Text>

                    <Text style={styles.rewardValue}>
                      +{challenge.xp_reward} XP
                    </Text>
                  </View>

                  {challenge.completed ? (
                    <IconLabel
                      icon="checkmark-circle"
                      color={colors.success}
                      textStyle={styles.badgeText}
                    >
                      Meta cumplida
                    </IconLabel>
                  ) : challenge.joined ? (
                    <Text style={styles.joinedText}>
                      Sigue entrenando
                    </Text>
                  ) : challenge.status === 'active' ? (
                    <TouchableOpacity
                      style={[
                        styles.joinButton,
                        isJoining &&
                          styles.joinButtonDisabled,
                      ]}
                      onPress={() =>
                        handleJoin(challenge)
                      }
                      disabled={isJoining}
                    >
                      {isJoining ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.onAccent}
                        />
                      ) : (
                        <Text style={styles.joinButtonText}>
                          Unirme al reto
                        </Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.unavailableBadge}>
                      <Text style={styles.unavailableText}>
                        {challenge.status === 'upcoming'
                          ? 'Próximamente'
                          : 'Finalizado'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = themedStyles(() => ({
  timeLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },

  timeLabelUrgent: {
    color: colors.accent,
    fontWeight: '700',
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },

  loadingText: {
    marginTop: spacing.md,
    color: colors.textMuted,
  },

  header: {
    marginBottom: spacing.xl,
  },

  tabSelector: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeTabButton: {
    backgroundColor: colors.border,
  },

  tabText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },

  activeTabText: {
    color: colors.text,
  },

  logo: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing.sm,
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },

  subtitle: {
    marginTop: spacing.xs,
    fontSize: 15,
    color: colors.textMuted,
  },

  errorCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },

  errorText: {
    color: colors.text,
    marginBottom: spacing.md,
  },

  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
  },

  retryButtonText: {
    color: colors.onAccent,
    fontWeight: '700',
  },

  emptyCard: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
  },

  emptyIcon: {
    marginBottom: spacing.md,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },

  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },

  challengeCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  completedCard: {
    opacity: 0.92,
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  challengeTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginLeft: spacing.sm,
    marginTop: 4,
  },

  activeStatusText: {
    color: colors.accent,
  },

  completedStatusText: {
    color: colors.success,
  },

  description: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  progressLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },

  progressValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  progressBarBackground: {
    height: 9,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.card2,
  },

  progressBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.accent,
  },

  completedProgress: {
    backgroundColor: colors.success,
  },

  rewardRow: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  rewardLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },

  rewardValue: {
    marginTop: 2,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },

  joinButton: {
    minWidth: 125,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  joinButtonDisabled: {
    opacity: 0.6,
  },

  joinButtonText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 13,
  },

  joinedText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },

  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },

  unavailableBadge: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card2,
  },

  unavailableText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
}));
