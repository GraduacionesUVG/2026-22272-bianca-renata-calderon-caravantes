import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Image
} from 'react-native';
import TouchableOpacity from '../components/PressableScale';
import AnimatedBar from '../components/AnimatedBar';
import FlameAnimation from '../components/FlameAnimation';
import ProgressRing from '../components/ProgressRing';

import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

import api from '../services/api';
import { challengeTimeLabel } from '../utils/dates';
import FadeInView from '../components/FadeInView';
import WorkoutHistory from '../components/WorkoutHistory';
import { formatHours, formatNumber } from '../components/WorkoutStatsCard';
import { colors, radius, spacing, themedStyles, useTheme } from '../constants/theme';

const mascot = require('../assets/mascot.png');

const WEEK_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const XP_PER_LEVEL = 500;

// "1 día" / "2 días"
const pluralize = (count, singular, plural) =>
  `${count} ${count === 1 ? singular : plural}`;

export default function HomeScreen({ navigation }) {
  const { mode, toggle } = useTheme();
  const [user, setUser] = useState(null);
  const [streak, setStreak] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Aparte del resto: si falla, Home se sigue viendo sin el contador.
  const loadUnreadNotifications = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadNotifications(response.data?.unread ?? 0);
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
    }
  };

  // Aparte del resto: si falla, Home se ve igual sin el resumen.
  const loadStats = async () => {
    try {
      const response = await api.get('/users/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  };

  const loadHomeData = async () => {
    loadUnreadNotifications();

    try {
      setError('');

      const [
        profileResponse,
        workoutsResponse,
        challengesResponse,
        streakResponse,
      ] = await Promise.all([
        api.get('/users/profile'),
        api.get('/workouts'),
        api.get('/challenges'),
        api.get('/users/streak'),
      ]);

      loadStats();
      setUser(profileResponse.data);
      setStreak(streakResponse.data);

      // Primera vez (o usuarios anteriores a la racha semanal): pedimos la meta.
      if (streakResponse.data?.weekly_goal == null) {
        navigation.navigate('WeeklyGoal', {
          onboarding: true,
          name:
            profileResponse.data?.full_name ||
            profileResponse.data?.username,
        });
      }
      setWorkouts(workoutsResponse.data || []);
      setChallenges(challengesResponse.data || []);
    } catch (err) {
      console.error('Error cargando Home:', err);

      setError(
        err.response?.data?.error ||
        'No fue posible cargar la información.'
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [])
  );

  const xpData = useMemo(() => {
    const xp = user?.xp || 0;

    const xpInsideCurrentLevel =
      xp % XP_PER_LEVEL;

    const xpToNextLevel =
      XP_PER_LEVEL - xpInsideCurrentLevel;

    const progress =
      (xpInsideCurrentLevel / XP_PER_LEVEL) * 100;

    return {
      xp,
      xpToNextLevel,
      progress,
    };
  }, [user]);

  const weekProgress = useMemo(() => {
    const today = new Date();

    const day = today.getDay();

    const mondayOffset =
      day === 0 ? -6 : 1 - day;

    const monday = new Date(today);

    monday.setHours(0, 0, 0, 0);

    monday.setDate(
      today.getDate() + mondayOffset
    );

    return WEEK_LABELS.map((_, index) => {
      const date = new Date(monday);

      date.setDate(
        monday.getDate() + index
      );

      const isToday =
        date.toDateString() ===
        today.toDateString();

      const hasWorkout = workouts.some(
        (workout) => {
          const workoutDate = new Date(
            workout.workout_date
          );

          return (
            workoutDate.toDateString() ===
            date.toDateString()
          );
        }
      );

      if (hasWorkout) {
        return 'done';
      }

      if (isToday) {
        return 'today';
      }

      return 'pending';
    });
  }, [workouts]);

  const activeChallenge = useMemo(() => {
    const joinedChallenges = challenges.filter(
      (challenge) =>
        challenge.joined &&
        !challenge.completed &&
        challenge.status === 'active'
    );

    if (joinedChallenges.length === 0) {
      return null;
    }

    return [...joinedChallenges].sort((a, b) => {
      const progressA =
        a.goal > 0 ? a.progress / a.goal : 0;

      const progressB =
        b.goal > 0 ? b.progress / b.goal : 0;

      return progressB - progressA;
    })[0];
  }, [challenges]);

  const activeChallengeProgress = useMemo(() => {
    if (!activeChallenge || activeChallenge.goal <= 0) {
      return 0;
    }

    return Math.min(
      (activeChallenge.progress / activeChallenge.goal) * 100,
      100
    );
  }, [activeChallenge]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          color={colors.accent}
        />

        <Text style={styles.loadingText}>
          Cargando tu progreso...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={mascot} style={styles.mascot} resizeMode="contain" />
          <View>
            <Text style={styles.logo}>
              Gymify
            </Text>

            <Text style={styles.greeting}>
              Hola, {user?.full_name || user?.username || 'Gymifier'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.bellButton}
          onPress={toggle}
          accessibilityLabel={mode === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        >
          <Ionicons
            name={mode === 'dark' ? 'sunny' : 'moon'}
            size={20}
            color={mode === 'dark' ? colors.gold : colors.purple}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bellButton}
          onPress={() => navigation.navigate('Notifications')}
          accessibilityLabel={
            unreadNotifications > 0
              ? `Notificaciones, ${unreadNotifications} sin leer`
              : 'Notificaciones'
          }
        >
          <Ionicons name="notifications-outline" size={20} color={colors.text} />

          {unreadNotifications > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        </View>
      </View>

      <View style={styles.chipsRow}>
        <View style={[styles.chip, { borderColor: colors.accent }]}>
          <Ionicons name="flame" size={20} color={colors.accent} />
          <Text style={[styles.chipText, { color: colors.accent }]}>{streak?.weeks ?? 0}</Text>
        </View>
        <View style={[styles.chip, { borderColor: colors.gold }]}>
          <Ionicons name="flash" size={20} color={colors.gold} />
          <Text style={[styles.chipText, { color: colors.gold }]}>{xpData.xp.toLocaleString()} XP</Text>
        </View>
        <View style={[styles.chip, { borderColor: colors.blue }]}>
          <Ionicons name="shield" size={19} color={colors.blue} />
          <Text style={[styles.chipText, { color: colors.blue }]}>Nivel {user?.level || 1}</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : null}

      <FadeInView delay={100} style={styles.card}>
        <View style={styles.streakRow}>
          <View>
            <Text style={styles.cardLabel}>
              Racha de entrenamiento
            </Text>

            <View style={styles.streakNumberRow}>
              <FlameAnimation size={44} lit={(streak?.weeks ?? 0) > 0} />

              <Text style={styles.streakNumber}>
                {streak?.weeks ?? 0}
              </Text>
            </View>

            <Text style={styles.streakSub}>
              {(streak?.weeks ?? 0) === 1 ? 'semana' : 'semanas'} cumpliendo tu meta
            </Text>
          </View>

          <View style={styles.levelBlock}>
            <Text style={styles.levelText}>
              Nivel {user?.level || 1}
            </Text>

            <Text style={styles.xpText}>
              {xpData.xp.toLocaleString()} XP
            </Text>

            <Text style={styles.xpSub}>
              {xpData.xpToNextLevel} para nivel{' '}
              {(user?.level || 1) + 1}
            </Text>
          </View>
        </View>

        <View style={styles.progressBarBg}>
          <AnimatedBar style={styles.progressBarFill} percent={xpData.progress} />
        </View>
      </FadeInView>

      {stats ? (
        <FadeInView delay={160}>
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Stats')}
            accessibilityRole="button"
            accessibilityLabel="Ver todas tus estadísticas"
          >
            <View style={styles.statsHeader}>
              <Text style={styles.cardLabelSmall}>Tus estadísticas · este mes</Text>
              <Text style={styles.statsLink}>Ver todo ›</Text>
            </View>

            {stats.total_workouts === 0 ? (
              <Text style={styles.statsEmpty}>
                Registra tu primer entrenamiento para ver tus estadísticas.
              </Text>
            ) : (
              <View style={styles.statsTiles}>
                {[
                  [stats.month_workouts, 'Entrenos'],
                  [formatHours(stats.month_minutes), 'Tiempo'],
                  [formatNumber(stats.month_calories), 'kcal'],
                ].map(([value, label]) => (
                  <View key={label} style={styles.statsTile}>
                    <Text
                      style={styles.statsTileValue}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {value}
                    </Text>
                    <Text style={styles.statsTileLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        </FadeInView>
      ) : null}

      <FadeInView delay={220} style={styles.card}>
        <View style={styles.weekHeader}>
          <Text style={styles.cardLabelSmall}>
            Esta semana
          </Text>

          {streak?.weekly_goal ? (
            <ProgressRing
              size={56}
              stroke={6}
              progress={streak.current_week_days / streak.weekly_goal}
            >
              <Text
                style={[
                  styles.weekGoalCount,
                  streak.current_week_completed &&
                    styles.weekGoalCountDone,
                ]}
              >
                {streak.current_week_days}/{streak.weekly_goal}
              </Text>
            </ProgressRing>
          ) : null}
        </View>

        <View style={styles.weekRow}>
          {WEEK_LABELS.map((label, index) => {
            const status =
              weekProgress[index];

            return (
              <View
                key={label}
                style={styles.dayColumn}
              >
                <View
                  style={[
                    styles.dayCircle,
                    status === 'done' &&
                    styles.dayCircleDone,
                    status === 'today' &&
                    styles.dayCircleToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayCircleText,
                      status === 'done' &&
                      styles.dayCircleTextDone,
                      status === 'today' &&
                      styles.dayCircleTextToday,
                    ]}
                  >
                    {label}
                  </Text>
                </View>

                {status === 'today' && (
                  <Text
                    style={styles.todayLabel}
                  >
                    hoy
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {streak?.weekly_goal ? (
          <>
            <Text style={styles.weekMessage}>
              {streak.current_week_completed
                ? 'Meta semanal cumplida. Tu racha sigue creciendo.'
                : `Te ${streak.remaining_days === 1 ? 'falta' : 'faltan'} ${pluralize(
                    streak.remaining_days,
                    'día',
                    'días'
                  )} de entrenamiento para completar tu meta semanal.`}
            </Text>

            <Text style={styles.weekFootnote}>
              Los días de descanso no interrumpen tu racha.
            </Text>
          </>
        ) : null}
      </FadeInView>

      <Text style={styles.sectionTitle}>
        Reto activo
      </Text>

      {activeChallenge ? (
        <FadeInView delay={340} style={styles.card}>
          <View style={styles.challengeHeader}>
            <View style={styles.challengeTitleRow}>
              <View style={styles.challengeTitleBlock}>
                <Text style={styles.challengeTitle}>
                  {activeChallenge.title}
                </Text>

                <Text style={styles.challengeSub}>
                  {activeChallenge.description}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.challengeProgressRow}>
            <Text style={styles.challengeProgressLabel}>
              Progreso
            </Text>

            <Text style={styles.challengeProgressValue}>
              {activeChallenge.progress} / {activeChallenge.goal}
            </Text>
          </View>

          <View style={styles.challengeProgressBackground}>
            <View
              style={[
                styles.challengeProgressFill,
                {
                  width: `${activeChallengeProgress}%`,
                },
              ]}
            />
          </View>

          <Text
            style={[
              styles.challengeTime,
              challengeTimeLabel(activeChallenge).urgent &&
                styles.challengeTimeUrgent,
            ]}
          >
            {challengeTimeLabel(activeChallenge).label}
          </Text>

          <View style={styles.challengeRewardRow}>
            <Text style={styles.challengeRewardLabel}>
              Recompensa
            </Text>

            <Text style={styles.challengeRewardValue}>
              +{activeChallenge.xp_reward} XP
            </Text>
          </View>
        </FadeInView>
      ) : (
        <FadeInView delay={460} style={styles.card}>
          <Text style={styles.challengeEmptyTitle}>
            No tienes un reto activo
          </Text>

          <Text style={styles.challengeSub}>
            Ve a Retos y únete a uno para comenzar.
          </Text>
        </FadeInView>
      )}

      <WorkoutHistory />
    </ScrollView>
  );
}

const styles = themedStyles(() => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: 40,
  },

  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: colors.textMuted,
    marginTop: spacing.md,
    fontSize: 12,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeText: {
    color: colors.onAccent,
    fontSize: 12,
    fontWeight: '700',
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  mascot: {
    width: 46,
    height: 52,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  chipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 4,
    backgroundColor: colors.card,
  },

  chipText: {
    fontSize: 13,
    fontWeight: '800',
  },

  logo: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -1,
  },

  greeting: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  errorCard: {
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  errorText: {
    color: colors.textMuted,
    fontSize: 11,
  },

  card: {
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsLink: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  statsEmpty: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  statsTiles: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statsTile: {
    flex: 1,
    backgroundColor: colors.card2,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },
  statsTileValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statsTileLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  cardLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 2,
  },

  cardLabelSmall: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.sm,
  },

  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },

  streakNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  streakNumber: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 36,
  },

  streakSub: {
    color: colors.textMuted,
    fontSize: 12,
  },

  levelBlock: {
    alignItems: 'flex-end',
  },

  levelText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },

  xpText: {
    color: colors.xp,
    fontSize: 13,
    fontWeight: '700',
  },

  xpSub: {
    color: colors.textMuted,
    fontSize: 11,
  },

  progressBarBg: {
    backgroundColor: colors.border,
    borderRadius: 4,
    height: 5,
  },

  progressBarFill: {
    backgroundColor: colors.gold,
    borderRadius: 4,
    height: 5,
  },

  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  weekGoalCount: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  weekGoalCountDone: {
    color: colors.success,
  },

  weekMessage: {
    color: colors.text,
    fontSize: 12,
    marginTop: spacing.md,
  },

  weekFootnote: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },

  dayColumn: {
    alignItems: 'center',
  },

  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayCircleDone: {
    backgroundColor: colors.success,
    borderColor: colors.successDark,
  },

  dayCircleToday: {
    borderColor: colors.accent,
  },

  dayCircleText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  dayCircleTextDone: {
    color: colors.onAccent,
  },

  dayCircleTextToday: {
    color: colors.accent,
  },

  todayLabel: {
    color: colors.accent,
    fontSize: 11,
    marginTop: 2,
  },

  sectionTitle: {
    color: colors.purple,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },

  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  challengeTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  challengeSub: {
    color: colors.textMuted,
    fontSize: 12,
  },

  challengeTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  challengeTitleBlock: {
    flex: 1,
  },

  challengeProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },

  challengeProgressLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },

  challengeProgressValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },

  challengeProgressBackground: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },

  challengeProgressFill: {
    height: '100%',
    backgroundColor: colors.blue,
    borderRadius: radius.pill,
  },

  challengeTime: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: spacing.sm,
  },

  challengeTimeUrgent: {
    color: colors.accent,
    fontWeight: '700',
  },

  challengeRewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },

  challengeRewardLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },

  challengeRewardValue: {
    color: colors.xp,
    fontSize: 13,
    fontWeight: '700',
  },

  challengeEmptyTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
}));
